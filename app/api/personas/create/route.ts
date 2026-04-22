import { NextResponse } from "next/server";

import { getOpenAIClient } from "@/lib/openai";
import type { PersonaGenerated } from "@/lib/types";

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

const PERSONA_GENERATION_INSTRUCTIONS = `
Convert the user's description into a realistic, high-signal persona optimized for evaluating product ideas.

The persona must be behaviorally specific, opinionated, and useful for making decisions. Do not generalize or summarize into vague traits.

CRITICAL REQUIREMENTS:

1. Preserve concrete behaviors
- Do not abstract actions into generic statements
- Keep specific behaviors (e.g. "saves content impulsively but rarely revisits", not "engages with content")

2. Make internal tension explicit
- Include at least one clear conflict in behavior or priorities
- Do not soften it (e.g. "wants originality but copies trends that perform")

3. Create a sharp decision lens
- The evaluation_lens must reflect how this persona judges ideas
- Each lens item must include:
  - criterion: what they judge
  - why_it_matters: why this matters to them specifically
  - tradeoff: what downside, risk, or compromise they are weighing
- Avoid generic criteria like "improves experience" or "increases engagement"

4. Add rejection triggers
- frustrations must include specific reasons they would quickly dismiss a product
- Avoid vague phrasing like "doesn't like complexity"

5. Ban generic language
Do NOT use phrases like:
- "increase engagement"
- "understand users"
- "maintain quality"
- "values authenticity"
Rewrite everything in concrete, observable terms

6. Keep it evaluation-ready
- The persona should naturally produce strong opinions, critiques, and questions
- Avoid neutral or agreeable tone

STYLE:
- Crisp, direct, slightly opinionated
- No fluff, no storytelling
- Every line should feel grounded in real behavior

OTHER RULES:
- Infer missing details conservatively
- Keep arrays concise (3-5 items max)
- Ensure internal consistency
- Produce a quote that reflects their actual mindset (not generic inspiration)

Do not include markdown.
Do not include any fields outside the schema.
`.trim();

export async function POST(req: Request) {
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

  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";

  if (!prompt) {
    return NextResponse.json(
      { error: "prompt is required" },
      { status: 400 },
    );
  }

  try {
    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      instructions: PERSONA_GENERATION_INSTRUCTIONS,
      input: prompt,
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

    const outputText = response.output_text?.trim();

    if (!outputText) {
      throw new Error("Empty model response");
    }

    const parsed = JSON.parse(outputText) as unknown;

    if (!isPersonaGenerated(parsed)) {
      throw new Error("Invalid persona payload");
    }

    return NextResponse.json({
      persona: parsed,
    });
  } catch (error) {
    console.error("Persona generation error:", error);

    return NextResponse.json(
      { error: "Failed to generate persona" },
      { status: 500 },
    );
  }
}