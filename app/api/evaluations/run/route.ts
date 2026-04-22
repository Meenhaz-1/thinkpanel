import { NextResponse } from "next/server";

import { getOpenAIClient } from "@/lib/openai";
import { getPersonasByIds } from "@/lib/get-personas";
import { formatEvaluationLens } from "@/lib/persona-evaluation-lens";
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
          what_concerns_me: { type: "array", items: { type: "string" } },
          questions_for_pm: { type: "array", items: { type: "string" } },
          top_concern: { type: "string" },
          suggestion: { type: "string" },
        },
        required: [
          "persona_id",
          "verdict",
          "score",
          "reaction",
          "metadata",
          "what_lands",
          "what_concerns_me",
          "questions_for_pm",
          "top_concern",
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
  title: string | null;
  feature_description: string;
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
        isStringArray(x.what_concerns_me) &&
        isStringArray(x.questions_for_pm) &&
        typeof x.top_concern === "string" &&
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

function getModelInstructions() {
  return `
You are a decision-support engine, not a chatbot.

Evaluate the feature across all selected personas and produce a sharp, grounded result.

Rules:
- Be specific, concise, and practical
- Avoid filler, generic praise, and generic questions
- Make each persona distinct
- Base each persona on its own goals, frustrations, and evaluation lens
- Keep all strings short enough for a UI
- No markdown
- No extra fields outside the schema

For each persona:
- reaction: one strong sentence
- what_lands: 2-3 concrete strengths
- what_concerns_me: 2-3 concrete risks
- questions_for_pm: 2-3 uncomfortable but useful questions tied to the persona
- top_concern: the single biggest issue
- suggestion: one clear next step

For the overall decision:
- Choose ship, risky, or reject based on the pattern across the panel
- Keep the decision summary short and decisive
`;
}

export async function POST(req: Request) {
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

  const { data: evaluationRow, error: evaluationError } = await supabase
    .from("evaluations")
    .select("*")
    .eq("id", evaluationId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (evaluationError || !evaluationRow) {
    return NextResponse.json(
      { error: "Evaluation not found" },
      { status: 404 },
    );
  }

  const row = evaluationRow as EvaluationRow;
  const selectedPersonaIds = Array.isArray(row.selected_persona_ids)
    ? Array.from(
        new Set(
          row.selected_persona_ids.filter(
            (value): value is string => typeof value === "string" && value.trim().length > 0,
          ),
        ),
      )
    : [];

  if (!selectedPersonaIds.length) {
    return NextResponse.json(
      { error: "No personas selected for this evaluation" },
      { status: 400 },
    );
  }

  const personas = await getPersonasByIds(selectedPersonaIds, { fallbackToMock: false });
  if (!personas.length) {
    return NextResponse.json(
      { error: "No personas found for this evaluation" },
      { status: 404 },
    );
  }

  try {
    await updateEvaluation(supabase, evaluationId, {
      status: "running",
      stage: "Preparing panel",
      error_message: null,
      started_at: row.started_at ?? new Date().toISOString(),
    });

    const personaContext = buildPersonaContext(personas);

    await updateEvaluation(supabase, evaluationId, {
      stage: "Evaluating idea",
    });

    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      temperature: 0.2,
      instructions: getModelInstructions(),
      input: `Feature:\n${row.feature_description}\n\nPersonas:\n${personaContext}`,
      text: {
        format: {
          type: "json_schema",
          name: "evaluation_result",
          strict: true,
          schema: evaluationSchema,
        },
      },
    });

    const responseAny = response as typeof response & {
      output_text?: string | null;
      output?: Array<{
        content?: Array<{ type?: string; text?: string }>;
      }>;
    };

    const outputText =
      responseAny.output_text ??
      responseAny.output?.[0]?.content?.[0]?.text ??
      responseAny.output?.[0]?.content?.find((item) => item.type === "output_text")?.text ??
      null;

    if (!outputText) {
      throw new Error("Empty model response");
    }

    const parsed = JSON.parse(outputText);
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
        score: Math.round(Math.max(0, Math.min(100, parsedPersona.score))),
        reaction: clamp(parsedPersona.reaction, 180),
        metadata: parsedPersona.metadata,
        what_lands: parsedPersona.what_lands.map((item) => clamp(item, 180)),
        what_concerns_me: parsedPersona.what_concerns_me.map((item) => clamp(item, 180)),
        questions_for_pm: parsedPersona.questions_for_pm.map((item) => clamp(item, 180)),
        top_concern: clamp(parsedPersona.top_concern, 180),
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
        what_concerns_me: personaResult.what_concerns_me,
        questions_for_pm: personaResult.questions_for_pm,
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

    return NextResponse.json({
      evaluation_id: evaluationId,
      result,
    });
  } catch (error) {
    console.error("Evaluation run error:", error);

    await updateEvaluation(supabase, evaluationId, {
      status: "failed",
      stage: "Finalizing recommendations",
      error_message: error instanceof Error ? error.message : "Failed to run evaluation",
      completed_at: new Date().toISOString(),
    }).catch((updateError) => {
      console.error("Failed to update failed evaluation:", updateError);
    });

    return NextResponse.json(
      { error: "Failed to run evaluation" },
      { status: 500 },
    );
  }
}
