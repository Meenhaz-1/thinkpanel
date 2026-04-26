import { NextResponse } from "next/server";

import { getOpenAIClient } from "@/lib/openai";
import type { PersonaGenerated } from "@/lib/types";
import {
  LLMOutputSafetyError,
  UserInputValidationError,
  validateGeneratedLLMOutput,
  validateUserLLMInput,
  wrapUntrustedUserInput,
} from "@/lib/llm-validation";
import { PERSONA_GENERATION_INSTRUCTIONS } from "@/lib/prompts/persona-generation";
import { authErrorResponse, requireApprovedUser } from "@/lib/auth";

const personaSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    name: { type: "string" },
    role: { type: "string" },
    company_size: {
      anyOf: [{ type: "string" }, { type: "null" }],
    },
    company_type: {
      anyOf: [{ type: "string" }, { type: "null" }],
    },
    seniority: {
      anyOf: [{ type: "string" }, { type: "null" }],
    },
    summary: { type: "string" },
    voice: {
      anyOf: [{ type: "string" }, { type: "null" }],
    },
    goals: {
      type: "array",
      items: { type: "string" },
    },
    frustrations: {
      type: "array",
      items: { type: "string" },
    },
    evaluation_lens: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          criterion: { type: "string" },
          why_it_matters: { type: "string" },
          tradeoff: { type: "string" },
        },
        required: ["criterion", "why_it_matters", "tradeoff"],
      },
    },
    quote: {
      anyOf: [{ type: "string" }, { type: "null" }],
    },
  },
  required: [
    "name",
    "role",
    "company_size",
    "company_type",
    "seniority",
    "summary",
    "voice",
    "goals",
    "frustrations",
    "evaluation_lens",
    "quote",
  ],
} as const;

type CreatePersonaBody = {
  prompt?: unknown;
};

function isPersonaGenerated(value: unknown): value is PersonaGenerated {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.name === "string" &&
    typeof candidate.role === "string" &&
    (typeof candidate.company_size === "string" || candidate.company_size === null) &&
    (typeof candidate.company_type === "string" || candidate.company_type === null) &&
    (typeof candidate.seniority === "string" || candidate.seniority === null) &&
    typeof candidate.summary === "string" &&
    (typeof candidate.voice === "string" || candidate.voice === null) &&
    Array.isArray(candidate.goals) &&
    candidate.goals.every((item) => typeof item === "string") &&
    Array.isArray(candidate.frustrations) &&
    candidate.frustrations.every((item) => typeof item === "string") &&
    Array.isArray(candidate.evaluation_lens) &&
    candidate.evaluation_lens.every(
      (item) =>
        item &&
        typeof item === "object" &&
        typeof (item as Record<string, unknown>).criterion === "string" &&
        typeof (item as Record<string, unknown>).why_it_matters === "string" &&
        typeof (item as Record<string, unknown>).tradeoff === "string",
    ) &&
    (typeof candidate.quote === "string" || candidate.quote === null)
  );
}

export async function POST(req: Request) {
  let auth;
  try {
    auth = await requireApprovedUser();
  } catch (error) {
    return authErrorResponse(error);
  }

  const client = getOpenAIClient();

  if (!client) {
    return NextResponse.json(
      { error: "Missing OPENAI_API_KEY" },
      { status: 500 },
    );
  }

  let body: CreatePersonaBody;

  try {
    body = (await req.json()) as CreatePersonaBody;
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  let prompt: string;

  try {
    prompt = validateUserLLMInput(body.prompt, {
      endpoint: "personas/create",
      fieldLabel: "persona description",
    }, {
      minLength: 40,
      maxLength: 1200,
      maxLines: 12,
      allowUrls: false,
      allowCodeBlocks: false,
      allowHtml: false,
      allowJsonLikeContent: false,
      rejectInstructionLikePatterns: true,
      rejectOnlyPunctuation: true,
      rejectRepeatedCharacters: true,
      rejectRepeatedWords: true,
      minWords: 8,
      minUniqueWords: 6,
    });
  } catch (error) {
    if (error instanceof UserInputValidationError) {
      console.warn("Blocked persona generation input", {
        endpoint: "personas/create",
        field: error.field,
        code: error.code,
        internalReason: error.internalReason,
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

  try {
    const response = await client.responses.create({
      model: "gpt-4.1",
      instructions: PERSONA_GENERATION_INSTRUCTIONS,
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: wrapUntrustedUserInput("persona description", prompt),
            },
          ],
        },
      ],
      safety_identifier: auth.user.id,
      max_output_tokens: 900,
      temperature: 0.4,
      text: {
        format: {
          type: "json_schema",
          name: "persona_generation",
          strict: true,
          schema: personaSchema,
        },
      },
    });

    const responseAny = response as {
      output_parsed?: unknown;
      output_text?: string | null;
      output?: Array<{
        type?: string;
        content?: Array<{
          type?: string;
          refusal?: string;
          text?: string;
        }>;
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
        "persona response",
        "Model refused to generate a structured persona.",
      );
    }

    const parsed =
      responseAny.output_parsed ??
      (() => {
        const outputText = responseAny.output_text?.trim();
        if (!outputText) {
          throw new Error("Empty model response");
        }

        return JSON.parse(outputText) as unknown;
      })();

    validateGeneratedLLMOutput(parsed, "persona");

    if (!isPersonaGenerated(parsed)) {
      throw new Error("Invalid persona payload");
    }

    return NextResponse.json({
      persona: parsed,
    });
  } catch (error) {
    console.error("Persona generation error:", error);

    if (error instanceof LLMOutputSafetyError) {
      return NextResponse.json(
        { error: "Failed to generate persona from that description" },
        { status: 422 },
      );
    }

    return NextResponse.json(
      { error: "Failed to generate persona" },
      { status: 500 },
    );
  }
}
