import { NextResponse } from "next/server";

import {
  UserInputValidationError,
  validateUserLLMInput,
} from "@/lib/llm-validation";
import {
  EVALUATION_PERSONA_COUNT,
  getEvaluationImageValidationError,
  isSupportedEvaluationImageType,
  sanitizeEvaluationImageName,
  type EvaluationImageInput,
} from "@/lib/evaluation-constraints";
import { authErrorResponse, requireApprovedUser } from "@/lib/auth";
import { getPersonasByIds } from "@/lib/get-personas";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import type { EvaluationRunRequest } from "@/lib/types";
import {
  enforceUsageLimit,
  recordUsageEvent,
  usageLimitResponse,
} from "@/lib/usage-limits";

type ParsedStartRequest = {
  featureDescription: unknown;
  imageFiles: File[];
  personaIds: unknown;
};

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

function validationResponse(error: string, code: string, field: string) {
  return NextResponse.json(
    {
      error,
      code,
      field,
    },
    { status: 400 },
  );
}

function isUploadedFile(value: FormDataEntryValue): value is File {
  return (
    typeof value === "object" &&
    value !== null &&
    "arrayBuffer" in value &&
    "size" in value &&
    "type" in value
  );
}

function parsePersonaIds(value: FormDataEntryValue | null): unknown {
  if (typeof value !== "string") {
    return [];
  }

  try {
    return JSON.parse(value);
  } catch {
    return [];
  }
}

async function parseStartRequest(req: Request): Promise<ParsedStartRequest> {
  const contentType = req.headers.get("content-type")?.toLowerCase() ?? "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData();

    return {
      featureDescription: formData.get("feature_description"),
      personaIds: parsePersonaIds(formData.get("persona_ids")),
      imageFiles: formData.getAll("images").filter(isUploadedFile),
    };
  }

  const body: EvaluationRunRequest = await req.json();
  return {
    featureDescription: body.feature_description,
    personaIds: body.persona_ids,
    imageFiles: [],
  };
}

async function toEvaluationImageInput(file: File): Promise<EvaluationImageInput> {
  const mimeType = file.type.toLowerCase();
  if (!isSupportedEvaluationImageType(mimeType)) {
    throw new Error("Unsupported evaluation image type");
  }

  const data = Buffer.from(await file.arrayBuffer()).toString("base64");
  return {
    dataUrl: `data:${mimeType};base64,${data}`,
    mimeType,
    name: sanitizeEvaluationImageName(file.name),
    sizeBytes: file.size,
  };
}

export async function POST(req: Request) {
  try {
    let auth;
    try {
      auth = await requireApprovedUser();
    } catch (error) {
      return authErrorResponse(error);
    }

    const workspaceId = process.env.DEFAULT_WORKSPACE_ID;
    const supabase = getSupabaseServerClient();

    if (!workspaceId || !supabase) {
      return NextResponse.json(
        { error: "Missing Supabase config" },
        { status: 500 },
      );
    }

    let parsedRequest: ParsedStartRequest;
    try {
      parsedRequest = await parseStartRequest(req);
    } catch {
      return validationResponse("Invalid input.", "invalid_request", "request");
    }

    let featureDescription: string;

    try {
      featureDescription = validateUserLLMInput(parsedRequest.featureDescription, {
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

    const personaIds = Array.isArray(parsedRequest.personaIds)
      ? Array.from(
          new Set(
            parsedRequest.personaIds.filter(
              (id): id is string => typeof id === "string" && id.trim().length > 0,
            ),
          ),
        )
      : [];

    if (personaIds.length !== EVALUATION_PERSONA_COUNT) {
      return validationResponse(
        `Select exactly ${EVALUATION_PERSONA_COUNT} personas to run the panel.`,
        "invalid_count",
        "personas",
      );
    }

    const selectedPersonas = await getPersonasByIds(personaIds, {
      fallbackToMock: false,
      viewer: auth.viewer,
    });
    if (selectedPersonas.length !== personaIds.length) {
      return validationResponse(
        "Select personas you have access to before running the panel.",
        "invalid_personas",
        "personas",
      );
    }

    const imageValidationError = getEvaluationImageValidationError(
      parsedRequest.imageFiles,
    );
    if (imageValidationError) {
      return validationResponse(imageValidationError, "invalid_images", "images");
    }

    const imageInputs = await Promise.all(
      parsedRequest.imageFiles.map(toEvaluationImageInput),
    );

    try {
      await enforceUsageLimit(auth, "evaluation_generation");
    } catch (error) {
      const response = usageLimitResponse(error);
      if (response) {
        return response;
      }

      throw error;
    }

    const { data, error } = await supabase
      .from("evaluations")
      .insert({
        workspace_id: workspaceId,
        owner_id: auth.user.id,
        title: deriveTitle(featureDescription),
        feature_description: featureDescription,
        image_inputs: imageInputs,
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

    const evaluationData = data as { id?: unknown };
    const evaluationId = typeof evaluationData.id === "string" ? evaluationData.id : null;
    if (!evaluationId) {
      return NextResponse.json(
        { error: "Failed to create evaluation run" },
        { status: 500 },
      );
    }

    await recordUsageEvent({
      userId: auth.user.id,
      eventType: "evaluation_generation",
      entityId: evaluationId,
    });

    return NextResponse.json({
      evaluation_id: evaluationId,
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
