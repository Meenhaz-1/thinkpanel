import { NextResponse } from "next/server";

import {
  UserInputValidationError,
  validateUserLLMInput,
} from "@/lib/llm-validation";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import type { EvaluationRunRequest } from "@/lib/types";

function deriveTitle(text: string) {
  const words = text
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .slice(0, 5);

  if (!words.length) {
    return "Untitled Evaluation";
  }

  return words
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export async function POST(req: Request) {
  try {
    const workspaceId = process.env.DEFAULT_WORKSPACE_ID;
    const supabase = getSupabaseServerClient();

    if (!workspaceId || !supabase) {
      return NextResponse.json(
        { error: "Missing Supabase config" },
        { status: 500 },
      );
    }

    const body: EvaluationRunRequest = await req.json();
    let featureDescription: string;

    try {
      featureDescription = validateUserLLMInput(body.feature_description, {
        endpoint: "evaluations/start",
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
        console.warn("Blocked evaluation start input", {
          endpoint: "evaluations/start",
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

    const personaIds = Array.isArray(body.persona_ids)
      ? Array.from(
          new Set(
            body.persona_ids.filter(
              (id): id is string => typeof id === "string" && id.trim().length > 0,
            ),
          ),
        )
      : [];

    if (!personaIds.length) {
      return NextResponse.json(
        { error: "persona_ids are required" },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from("evaluations")
      .insert({
        workspace_id: workspaceId,
        title: deriveTitle(featureDescription),
        feature_description: featureDescription,
        status: "pending",
        stage: "Preparing panel",
        selected_persona_ids: personaIds,
        started_at: new Date().toISOString(),
        error_message: null,
        decision: null,
        decision_summary: null,
        why: [],
        top_fixes: [],
        confidence: null,
      })
      .select("id")
      .single();

    if (error || !data) {
      return NextResponse.json(
        {
          error: error?.message ?? "Failed to create evaluation run",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      evaluation_id: data.id,
      status: "pending",
      stage: "Preparing panel",
    });
  } catch (error) {
    console.error("Start evaluation error:", error);
    return NextResponse.json(
      { error: "Failed to create evaluation run" },
      { status: 500 },
    );
  }
}
