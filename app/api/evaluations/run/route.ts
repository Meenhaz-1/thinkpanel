import { NextResponse } from "next/server";

import { getOpenAIClient } from "@/lib/openai";
import { getPersonasByIds } from "@/lib/get-personas";
import { formatEvaluationLens } from "@/lib/persona-evaluation-lens";
import {
  EVALUATION_IMAGE_DETAIL,
  EVALUATION_PERSONA_COUNT,
  getEvaluationImages,
} from "@/lib/evaluation-constraints";
import { authErrorResponse, requireApprovedUser } from "@/lib/auth";
import {
  LLMOutputSafetyError,
  UserInputValidationError,
  validateGeneratedLLMOutput,
  validateUserLLMInput,
  wrapUntrustedUserInput,
} from "@/lib/llm-validation";
import { EVALUATION_INSTRUCTIONS } from "@/lib/prompts/evaluation";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import type {
  EvaluationExecutionRequest,
  EvaluationResult,
  Persona,
  PersonaEvaluation,
  PersonaEvaluationDetails,
} from "@/lib/types";

const evaluationSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    decision: { enum: ["ship", "risky", "reject"] },
    decision_summary: { type: "string" },
    why: { type: "array", items: { type: "string" } },
    top_fixes: { type: "array", items: { type: "string" } },
    confidence: { type: "number", minimum: 0, maximum: 100 },
    personas: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          persona_id: { type: "string" },
          verdict: { enum: ["love", "like", "mixed", "reject"] },
          score: { type: "integer", minimum: 0, maximum: 100 },
          reaction: { type: "string" },
          metadata: {
            type: "object",
            additionalProperties: false,
            properties: {
              role: { type: "string" },
              company: { type: "string" },
              device: { type: "string" },
              usage: { type: "string" },
              evaluation_lens: { type: "string" },
            },
            required: ["role", "company", "device", "usage", "evaluation_lens"],
          },
          what_lands: { type: "array", items: { type: "string" } },
          why_i_push_back: { type: "array", items: { type: "string" } },
          this_fails_if: { type: "array", items: { type: "string" } },
          hidden_assumption: { type: "string" },
          questions_for_pm: { type: "array", items: { type: "string" } },
          top_concern: { type: "string" },
          what_would_change_my_mind: { type: "string" },
          suggestion: { type: "string" },
        },
        required: [
          "persona_id",
          "verdict",
          "score",
          "reaction",
          "metadata",
          "what_lands",
          "why_i_push_back",
          "this_fails_if",
          "hidden_assumption",
          "questions_for_pm",
          "top_concern",
          "what_would_change_my_mind",
          "suggestion",
        ],
      },
    },
  },
  required: ["decision", "decision_summary", "why", "top_fixes", "confidence", "personas"],
} as const;

type EvaluationRow = {
  id: string;
  workspace_id: string;
  owner_id?: string | null;
  title: string | null;
  feature_description: string;
  image_inputs?: unknown;
  decision: EvaluationResult["decision"] | null;
  decision_summary: string | null;
  why: string[] | null;
  top_fixes: string[] | null;
  confidence: number | null;
  status?: string | null;
  stage?: string | null;
  selected_persona_ids?: string[] | null;
  error_message?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
};

function clamp(text: string, max = 200) {
  const normalized = text.trim();
  return normalized.length > max ? `${normalized.slice(0, max)}…` : normalized;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isPersonaEvaluationMetadata(
  value: unknown,
): value is PersonaEvaluationDetails["metadata"] {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.role === "string" &&
    typeof candidate.company === "string" &&
    typeof candidate.device === "string" &&
    typeof candidate.usage === "string" &&
    typeof candidate.evaluation_lens === "string"
  );
}

function isEvaluationResult(value: unknown): value is EvaluationResult {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    ["ship", "risky", "reject"].includes(candidate.decision as string) &&
    typeof candidate.decision_summary === "string" &&
    isStringArray(candidate.why) &&
    isStringArray(candidate.top_fixes) &&
    typeof candidate.confidence === "number" &&
    Array.isArray(candidate.personas) &&
    candidate.personas.every((persona) => {
      if (!persona || typeof persona !== "object") {
        return false;
      }

      const x = persona as Record<string, unknown>;
      return (
        typeof x.persona_id === "string" &&
        ["love", "like", "mixed", "reject"].includes(x.verdict as string) &&
        typeof x.score === "number" &&
        typeof x.reaction === "string" &&
        isPersonaEvaluationMetadata(x.metadata) &&
        isStringArray(x.what_lands) &&
        isStringArray(x.why_i_push_back) &&
        isStringArray(x.this_fails_if) &&
        typeof x.hidden_assumption === "string" &&
        isStringArray(x.questions_for_pm) &&
        typeof x.top_concern === "string" &&
        typeof x.what_would_change_my_mind === "string" &&
        typeof x.suggestion === "string"
      );
    })
  );
}

function calculatePanelScore(personas: PersonaEvaluation[]) {
  if (!personas.length) {
    return 0;
  }

  const average = personas.reduce((sum, persona) => sum + persona.score, 0) / personas.length;
  return Math.max(0, Math.min(100, Math.round(average)));
}

function bandScoreByVerdict(
  verdict: PersonaEvaluation["verdict"],
  rawScore: number,
) {
  const normalized = Math.max(0, Math.min(100, Math.round(rawScore)));

  switch (verdict) {
    case "love":
      return Math.round(80 + (normalized / 100) * 20);
    case "like":
      return Math.round(55 + (normalized / 100) * 24);
    case "mixed":
      return Math.round(25 + (normalized / 100) * 29);
    case "reject":
      return Math.round((normalized / 100) * 24);
  }
}

function validationResponse(error: string, field: string) {
  return NextResponse.json(
    {
      error,
      code: "invalid_count",
      field,
    },
    { status: 400 },
  );
}

async function updateEvaluation(
  supabase: NonNullable<ReturnType<typeof getSupabaseServerClient>>,
  evaluationId: string,
  fields: Record<string, unknown>,
) {
  const { error } = await supabase.from("evaluations").update(fields).eq("id", evaluationId);
  if (error) {
    throw error;
  }
}

async function upsertPersonaResponse(
  supabase: NonNullable<ReturnType<typeof getSupabaseServerClient>>,
  payload: Record<string, unknown>,
  details: PersonaEvaluationDetails | null,
) {
  const withDetails = details ? { ...payload, details } : payload;
  const { error: detailsError } = await supabase
    .from("evaluation_persona_responses")
    .insert(withDetails);

  if (!detailsError) {
    return null;
  }

  if (detailsError.code === "PGRST204" || /details/i.test(detailsError.message)) {
    const { error: fallbackError } = await supabase
      .from("evaluation_persona_responses")
      .insert(payload);

    if (!fallbackError) {
      return null;
    }

    return fallbackError;
  }

  const failurePayload = {
    ...payload,
    status: "failed",
    error_message: detailsError.message,
  };

  const { error: failureInsertError } = await supabase
    .from("evaluation_persona_responses")
    .insert(failurePayload);

  return failureInsertError ?? detailsError;
}

function buildPersonaContext(personas: {
  id: string;
  name: string;
  role: string;
  summary: string;
  goals: string[];
  frustrations: string[];
  evaluationLens: Persona["evaluationLens"];
  voice: string;
}[]) {
  return personas
    .map(
      (persona) => `
Persona ID: ${persona.id}
Name: ${persona.name}
Role: ${persona.role}

Summary:
${persona.summary}

Goals:
- ${persona.goals.join("\n- ")}

Frustrations:
- ${persona.frustrations.join("\n- ")}

Evaluation Lens:
- ${formatEvaluationLens(persona.evaluationLens, "decision quality")}

Voice:
${persona.voice}
`,
    )
    .join("\n");
}

export async function POST(req: Request) {
  let auth;
  try {
    auth = await requireApprovedUser();
  } catch (error) {
    return authErrorResponse(error);
  }

  const openai = getOpenAIClient();
  const supabase = getSupabaseServerClient();
  const workspaceId = process.env.DEFAULT_WORKSPACE_ID;

  if (!openai) {
    return NextResponse.json(
      { error: "Missing OPENAI_API_KEY" },
      { status: 500 },
    );
  }

  if (!supabase || !workspaceId) {
    return NextResponse.json(
      { error: "Missing Supabase config" },
      { status: 500 },
    );
  }

  let body: EvaluationExecutionRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const evaluationId = body.evaluation_id?.trim();
  if (!evaluationId) {
    return NextResponse.json(
      { error: "evaluation_id is required" },
      { status: 400 },
    );
  }

  let evaluationQuery = supabase
    .from("evaluations")
    .select(
      [
        "id",
        "workspace_id",
        "owner_id",
        "title",
        "feature_description",
        "image_inputs",
        "decision",
        "decision_summary",
        "why",
        "top_fixes",
        "confidence",
        "status",
        "stage",
        "selected_persona_ids",
        "error_message",
        "started_at",
        "completed_at",
      ].join(", "),
    )
    .eq("id", evaluationId)
    .eq("workspace_id", workspaceId);

  if (!auth.isAdmin) {
    evaluationQuery = evaluationQuery.eq("owner_id", auth.user.id);
  }

  const { data: evaluationRow, error: evaluationError } =
    await evaluationQuery.maybeSingle();

  if (evaluationError || !evaluationRow) {
    return NextResponse.json(
      { error: "Evaluation not found" },
      { status: 404 },
    );
  }

  const row = evaluationRow as unknown as EvaluationRow;
  const selectedPersonaIds = Array.isArray(row.selected_persona_ids)
    ? Array.from(
        new Set(
          row.selected_persona_ids.filter(
            (value): value is string => typeof value === "string" && value.trim().length > 0,
          ),
        ),
      )
    : [];

  if (selectedPersonaIds.length !== EVALUATION_PERSONA_COUNT) {
    return validationResponse(
      `Select exactly ${EVALUATION_PERSONA_COUNT} personas for this evaluation`,
      "personas",
    );
  }

  const personas = await getPersonasByIds(selectedPersonaIds, {
    fallbackToMock: false,
    viewer: auth.viewer,
  });
  if (personas.length !== selectedPersonaIds.length) {
    return NextResponse.json(
      { error: "No personas found for this evaluation" },
      { status: 404 },
    );
  }

  try {
    let featureDescription: string;

    try {
      featureDescription = validateUserLLMInput(row.feature_description, {
        endpoint: "evaluations/run",
        fieldLabel: "idea",
      }, {
        minLength: 20,
        maxLength: 2500,
        maxLines: 25,
        allowUrls: false,
        allowCodeBlocks: false,
        allowHtml: false,
        allowJsonLikeContent: false,
        rejectInstructionLikePatterns: true,
        rejectOnlyPunctuation: true,
        rejectRepeatedCharacters: true,
        rejectRepeatedWords: true,
        minWords: 4,
        minUniqueWords: 4,
      });
    } catch (error) {
      if (error instanceof UserInputValidationError) {
        console.warn("Blocked evaluation run input", {
          endpoint: "evaluations/run",
          field: error.field,
          code: error.code,
          internalReason: error.internalReason,
        });

        await updateEvaluation(supabase, evaluationId, {
          status: "failed",
          stage: "Finalizing recommendations",
          error_message: error.userMessage,
        }).catch((updateError) => {
          console.error("Failed to update invalid evaluation:", updateError);
        });

        return NextResponse.json(
          {
            error: error.userMessage,
            code: error.code,
            field: error.field,
          },
          { status: 400 },
        );
      }

      throw error;
    }

    await updateEvaluation(supabase, evaluationId, {
      status: "running",
      stage: "Preparing panel",
      error_message: null,
      started_at: row.started_at ?? new Date().toISOString(),
    });

    const personaContext = buildPersonaContext(personas);
    const imageInputs = getEvaluationImages(row.image_inputs);

    await updateEvaluation(supabase, evaluationId, {
      stage: "Evaluating idea",
    });

    const inputContent = [
      {
        type: "input_text" as const,
        text: [
          wrapUntrustedUserInput("idea", featureDescription),
          imageInputs.length
            ? `ATTACHED IMAGE COUNT: ${imageInputs.length}`
            : "ATTACHED IMAGE COUNT: 0",
          wrapUntrustedUserInput("persona context", personaContext),
        ].join("\n\n"),
      },
      ...imageInputs.map((image) => ({
        type: "input_image" as const,
        image_url: image.dataUrl,
        detail: EVALUATION_IMAGE_DETAIL,
      })),
    ];

    const response = await openai.responses.create({
      model: "gpt-4.1",
      temperature: 0.2,
      instructions: EVALUATION_INSTRUCTIONS,
      input: [
        {
          role: "user",
          content: inputContent,
        },
      ],
      safety_identifier: auth.user.id,
      text: {
        format: {
          type: "json_schema",
          name: "evaluation_result",
          strict: true,
          schema: evaluationSchema,
        },
      },
    });

    const responseAny = response as {
      output_text?: string | null;
      output_parsed?: unknown;
      output?: Array<{
        type?: string;
        content?: Array<{ type?: string; refusal?: string; text?: string }>;
      }>;
    };

    const refusalText = responseAny.output
      ?.flatMap((item) => item.content ?? [])
      .find(
        (item): item is { type: "refusal"; refusal: string } =>
          item.type === "refusal" && typeof item.refusal === "string",
      )?.refusal;

    if (refusalText) {
      throw new LLMOutputSafetyError(
        "evaluation response",
        "Model refused to generate a structured evaluation.",
      );
    }

    const outputText =
      responseAny.output_parsed ??
      responseAny.output_text ??
      responseAny.output?.[0]?.content?.[0]?.text ??
      responseAny.output?.[0]?.content?.find((item) => item.type === "output_text")?.text ??
      null;

    const parsed =
      typeof outputText === "string"
        ? JSON.parse(outputText)
        : outputText ?? (() => {
            throw new Error("Empty model response");
          })();

    validateGeneratedLLMOutput(parsed, "evaluation");
    if (!isEvaluationResult(parsed)) {
      throw new Error("Invalid evaluation payload");
    }

    const personaMap = new Map(personas.map((persona) => [persona.id, persona]));
    const parsedPersonaMap = new Map(parsed.personas.map((persona) => [persona.persona_id, persona]));

    const normalizedPersonas = personas.map((persona) => {
      const parsedPersona = parsedPersonaMap.get(persona.id);
      if (!parsedPersona) {
        throw new Error(`Missing evaluation for persona ${persona.id}`);
      }

      return {
        persona_id: persona.id,
        verdict: parsedPersona.verdict,
        score: bandScoreByVerdict(parsedPersona.verdict, parsedPersona.score),
        reaction: clamp(parsedPersona.reaction, 180),
        metadata: parsedPersona.metadata,
        what_lands: parsedPersona.what_lands.map((item) => clamp(item, 180)),
        why_i_push_back: parsedPersona.why_i_push_back.map((item) => clamp(item, 180)),
        this_fails_if: parsedPersona.this_fails_if.map((item) => clamp(item, 180)),
        hidden_assumption: clamp(parsedPersona.hidden_assumption, 200),
        questions_for_pm: parsedPersona.questions_for_pm.map((item) => clamp(item, 180)),
        top_concern: clamp(parsedPersona.top_concern, 180),
        what_would_change_my_mind: clamp(parsedPersona.what_would_change_my_mind, 200),
        suggestion: clamp(parsedPersona.suggestion, 220),
      } satisfies PersonaEvaluation;
    });

    const result: EvaluationResult = {
      decision: parsed.decision,
      decision_summary: clamp(parsed.decision_summary, 220),
      why: parsed.why.map((item) => clamp(item, 220)),
      top_fixes: parsed.top_fixes.map((item) => clamp(item, 220)),
      confidence: calculatePanelScore(normalizedPersonas),
      personas: normalizedPersonas,
    };

    validateGeneratedLLMOutput(result, "evaluation result");

    await updateEvaluation(supabase, evaluationId, {
      decision: result.decision,
      decision_summary: result.decision_summary,
      why: result.why,
      top_fixes: result.top_fixes,
      confidence: result.confidence,
      status: "running",
      stage: "Gathering persona reactions",
    });

    await supabase
      .from("evaluation_persona_responses")
      .delete()
      .eq("evaluation_id", evaluationId);

    const responseErrors: string[] = [];

    for (const personaResult of result.personas) {
      const persona = personaMap.get(personaResult.persona_id);
      if (!persona) {
        responseErrors.push(`Missing persona ${personaResult.persona_id}`);
        continue;
      }

      const details: PersonaEvaluationDetails = {
        metadata: personaResult.metadata,
        what_lands: personaResult.what_lands,
        why_i_push_back: personaResult.why_i_push_back,
        this_fails_if: personaResult.this_fails_if,
        hidden_assumption: personaResult.hidden_assumption,
        questions_for_pm: personaResult.questions_for_pm,
        what_would_change_my_mind: personaResult.what_would_change_my_mind,
      };

      const error = await upsertPersonaResponse(
        supabase,
        {
          evaluation_id: evaluationId,
          persona_id: personaResult.persona_id,
          verdict: personaResult.verdict,
          score: personaResult.score,
          reaction: personaResult.reaction,
          top_concern: personaResult.top_concern,
          suggestion: personaResult.suggestion,
          status: "completed",
          error_message: null,
        },
        details,
      );

      if (error) {
        responseErrors.push(error.message ?? `Failed to save persona ${personaResult.persona_id}`);
      }
    }

    const finalStatus = responseErrors.length ? "partial_error" : "completed";
    await updateEvaluation(supabase, evaluationId, {
      status: finalStatus,
      stage: "Finalizing recommendations",
      error_message: responseErrors.length ? responseErrors[0] : null,
      completed_at: new Date().toISOString(),
    });

    console.log(
      "Evaluation result payload:\n%s",
      JSON.stringify(
        {
          evaluation_id: evaluationId,
          status: finalStatus,
          result,
        },
        null,
        2,
      ),
    );

    return NextResponse.json({
      evaluation_id: evaluationId,
      result,
    });
  } catch (error) {
    console.error("Evaluation run error:", error);

    const status = error instanceof LLMOutputSafetyError ? 422 : 500;
    const message =
      error instanceof LLMOutputSafetyError
        ? "Unable to complete the evaluation from that input"
        : "Failed to run evaluation";

    await updateEvaluation(supabase, evaluationId, {
      status: "failed",
      stage: "Finalizing recommendations",
      error_message: error instanceof Error ? error.message : "Failed to run evaluation",
      completed_at: new Date().toISOString(),
    }).catch((updateError) => {
      console.error("Failed to update failed evaluation:", updateError);
    });

    return NextResponse.json(
      { error: message },
      { status },
    );
  }
}
