import { evaluationDrafts, evaluationResults, evaluationSummaries } from "@/lib/mock-data";
import { getPersonasByIds } from "@/lib/get-personas";
import { formatEvaluationLens } from "@/lib/persona-evaluation-lens";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import type {
  EvaluationDraft,
  EvaluationRecord,
  EvaluationRuntimeDetail,
  EvaluationSummary,
  EvaluationStatus,
  EvaluationStage,
  Persona,
  PersonaEvaluation,
  PersonaEvaluationDetails,
  PersonaEvaluationStatus,
} from "@/lib/types";

type EvaluationRow = Pick<
  EvaluationRecord,
  | "id"
  | "title"
  | "feature_description"
  | "decision"
  | "decision_summary"
  | "why"
  | "top_fixes"
  | "confidence"
  | "status"
  | "stage"
  | "selected_persona_ids"
  | "error_message"
  | "started_at"
  | "completed_at"
  | "created_at"
>;

type EvaluationPersonaResponseRow = {
  id: string;
  evaluation_id: string;
  persona_id: string;
  verdict: PersonaEvaluation["verdict"];
  score: number;
  reaction: string;
  top_concern: string;
  suggestion: string;
  details: unknown;
  status?: PersonaEvaluationStatus | null;
  error_message?: string | null;
  created_at: string;
};

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
}

function asMaybeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
}

function isEvaluationStatus(value: unknown): value is EvaluationStatus {
  return (
    value === "pending" ||
    value === "running" ||
    value === "completed" ||
    value === "partial_error" ||
    value === "failed"
  );
}

function isEvaluationStage(value: unknown): value is EvaluationStage {
  return (
    value === "Preparing panel" ||
    value === "Evaluating idea" ||
    value === "Gathering persona reactions" ||
    value === "Finalizing recommendations"
  );
}

function isPersonaEvaluationDetails(value: unknown): value is PersonaEvaluationDetails {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  const metadata = candidate.metadata as Record<string, unknown> | undefined;

  return (
    !!metadata &&
    typeof metadata.role === "string" &&
    typeof metadata.company === "string" &&
    typeof metadata.device === "string" &&
    typeof metadata.usage === "string" &&
    typeof metadata.evaluation_lens === "string" &&
    Array.isArray(candidate.what_lands) &&
    candidate.what_lands.every((item) => typeof item === "string") &&
    Array.isArray(candidate.what_concerns_me) &&
    candidate.what_concerns_me.every((item) => typeof item === "string") &&
    Array.isArray(candidate.questions_for_pm) &&
    candidate.questions_for_pm.every((item) => typeof item === "string")
  );
}

function firstOrFallback(values: string[], fallback: string) {
  return values.find((value) => value.trim().length > 0)?.trim() ?? fallback;
}

function lowerCaseFirst(value: string) {
  return value.charAt(0).toLowerCase() + value.slice(1);
}

function deriveTitle(featureDescription: string) {
  const words = featureDescription
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

function formatRelativeTime(isoDate: string) {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return "Recently";
  }

  const diffMs = Date.now() - date.getTime();
  const absSeconds = Math.round(Math.abs(diffMs) / 1000);

  if (absSeconds < 60) {
    return "Just now";
  }

  const minutes = Math.round(absSeconds / 60);
  if (minutes < 60) {
    return `${minutes} minute${minutes === 1 ? "" : "s"} ${diffMs > 0 ? "ago" : "from now"}`;
  }

  const hours = Math.round(minutes / 60);
  if (hours < 24) {
    return `${hours} hour${hours === 1 ? "" : "s"} ${diffMs > 0 ? "ago" : "from now"}`;
  }

  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ${diffMs > 0 ? "ago" : "from now"}`;
}

function calculatePanelScore(personaEvaluations: Array<{ evaluation: PersonaEvaluation | null }>) {
  const scores = personaEvaluations
    .map((item) => item.evaluation?.score)
    .filter((score): score is number => typeof score === "number");

  if (!scores.length) {
    return null;
  }

  const total = scores.reduce((sum, score) => sum + score, 0);
  return Math.max(0, Math.min(100, Math.round(total / scores.length)));
}

function buildFallbackDetails(
  persona: Persona,
  row: Pick<EvaluationPersonaResponseRow, "reaction" | "top_concern" | "suggestion">,
): PersonaEvaluationDetails {
  const primaryGoal = firstOrFallback(persona.goals, "reduce friction");
  const primaryFrustration = firstOrFallback(persona.frustrations, "unclear tradeoffs");
  const primaryLens = formatEvaluationLens(persona.evaluationLens, "decision quality");
  const roleLabel = lowerCaseFirst(persona.role);

  return {
    metadata: {
      role: persona.role,
      company: persona.summary ? "Team context inferred" : "Not specified",
      device: "Desktop",
      usage: "Regular",
      evaluation_lens: primaryLens,
    },
    what_lands: [
      `It supports ${primaryGoal.toLowerCase()}.`,
      `It gives ${roleLabel} a clearer way to judge ${primaryLens.toLowerCase()}.`,
    ],
    what_concerns_me: [
      row.top_concern || `It may still add friction around ${primaryFrustration.toLowerCase()}.`,
      `I need to know whether this helps or slows down ${primaryGoal.toLowerCase()}.`,
    ],
    questions_for_pm: [
      `How does this help a ${roleLabel} make faster decisions?`,
      `What would stop ${primaryFrustration.toLowerCase()} from becoming a blocker?`,
      `What is the smallest version that proves value for teams focused on ${primaryLens.toLowerCase()}?`,
    ],
  };
}

function normalizePersonaEvaluation(
  persona: Persona,
  row: EvaluationPersonaResponseRow,
): PersonaEvaluation {
  const fallbackDetails = buildFallbackDetails(persona, row);
  const details = isPersonaEvaluationDetails(row.details) ? row.details : fallbackDetails;

  return {
    persona_id: row.persona_id,
    verdict: row.verdict,
    score: Math.round(row.score),
    reaction: row.reaction.trim(),
    top_concern: row.top_concern.trim(),
    suggestion: row.suggestion.trim(),
    metadata: {
      role: details.metadata.role || fallbackDetails.metadata.role,
      company: details.metadata.company || fallbackDetails.metadata.company,
      device: details.metadata.device || fallbackDetails.metadata.device,
      usage: details.metadata.usage || fallbackDetails.metadata.usage,
      evaluation_lens:
        details.metadata.evaluation_lens || fallbackDetails.metadata.evaluation_lens,
    },
    what_lands: details.what_lands.length ? details.what_lands : fallbackDetails.what_lands,
    what_concerns_me: details.what_concerns_me.length
      ? details.what_concerns_me
      : fallbackDetails.what_concerns_me,
    questions_for_pm: details.questions_for_pm.length
      ? details.questions_for_pm
      : fallbackDetails.questions_for_pm,
  };
}

function isRuntimePersonaEvaluationStatus(
  value: unknown,
): value is PersonaEvaluationStatus {
  return value === "pending" || value === "completed" || value === "failed";
}

function buildRuntimePersonaEvaluation(
  persona: Persona,
  responseRow?: EvaluationPersonaResponseRow,
): {
  persona: Persona;
  status: PersonaEvaluationStatus;
  evaluation: PersonaEvaluation | null;
  errorMessage: string | null;
} {
  if (!responseRow) {
    return {
      persona,
      status: "pending",
      evaluation: null,
      errorMessage: null,
    };
  }

  const status = isRuntimePersonaEvaluationStatus(responseRow.status)
    ? responseRow.status
    : responseRow.error_message
      ? "failed"
      : "completed";

  if (status === "failed") {
    return {
      persona,
      status,
      evaluation: null,
      errorMessage: responseRow.error_message ?? "Persona evaluation failed.",
    };
  }

  return {
    persona,
    status: "completed",
    evaluation: normalizePersonaEvaluation(persona, responseRow),
    errorMessage: null,
  };
}

function buildRuntimeDetailFromRows(
  evaluationRow: EvaluationRow,
  responseRows: EvaluationPersonaResponseRow[] = [],
  personas: Persona[] = [],
): EvaluationRuntimeDetail {
  const selectedPersonaIds = asMaybeStringArray(evaluationRow.selected_persona_ids);
  const responsePersonaIds = responseRows.map((row) => row.persona_id);
  const orderedPersonaIds = selectedPersonaIds.length ? selectedPersonaIds : responsePersonaIds;

  const personaMap = new Map(personas.map((persona) => [persona.id, persona]));
  const responseMap = new Map(responseRows.map((row) => [row.persona_id, row]));

  const personaEvaluations = orderedPersonaIds
    .map((personaId) => {
      const persona = personaMap.get(personaId);
      if (!persona) {
        return null;
      }

      return buildRuntimePersonaEvaluation(persona, responseMap.get(personaId));
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  const status = isEvaluationStatus(evaluationRow.status)
    ? evaluationRow.status
    : responseRows.length
      ? responseRows.some((row) => row.status === "failed" || row.error_message)
        ? "partial_error"
        : "completed"
      : "pending";

  const isComplete = status === "completed" || status === "partial_error";
  const confidence = isComplete ? calculatePanelScore(personaEvaluations) : null;

  return {
    id: evaluationRow.id,
    title: evaluationRow.title ?? deriveTitle(evaluationRow.feature_description),
    feature_description: evaluationRow.feature_description,
    status,
    stage: isEvaluationStage(evaluationRow.stage) ? evaluationRow.stage : null,
    errorMessage: evaluationRow.error_message ?? null,
    startedAt: evaluationRow.started_at ?? null,
    completedAt: evaluationRow.completed_at ?? null,
    decision: isComplete ? evaluationRow.decision : null,
    decision_summary: isComplete ? evaluationRow.decision_summary : null,
    why: isComplete ? asStringArray(evaluationRow.why) : [],
    top_fixes: isComplete ? asStringArray(evaluationRow.top_fixes) : [],
    confidence,
    selectedPersonaIds: orderedPersonaIds,
    personaEvaluations,
  };
}

async function fetchEvaluationFromDatabase(
  id: string,
): Promise<EvaluationRuntimeDetail | null> {
  const workspaceId = process.env.DEFAULT_WORKSPACE_ID;
  const supabase = getSupabaseServerClient();

  if (!workspaceId || !supabase) {
    return null;
  }

  const { data: evaluationRow, error: evaluationError } = await supabase
    .from("evaluations")
    .select("*")
    .eq("id", id)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (evaluationError || !evaluationRow) {
    return null;
  }

  const { data: responseRows, error: responseError } = await supabase
    .from("evaluation_persona_responses")
    .select("*")
    .eq("evaluation_id", id)
    .order("created_at", { ascending: true });

  if (responseError || !responseRows) {
    return null;
  }

  const selectedPersonaIds = asMaybeStringArray(
    (evaluationRow as EvaluationRow).selected_persona_ids,
  );
  const responsePersonaIds = (responseRows as EvaluationPersonaResponseRow[]).map(
    (row) => row.persona_id,
  );
  const personaIds = selectedPersonaIds.length ? selectedPersonaIds : responsePersonaIds;

  const personas = await getPersonasByIds(personaIds, {
    fallbackToMock: true,
  });

  return buildRuntimeDetailFromRows(
    evaluationRow as EvaluationRow,
    responseRows as EvaluationPersonaResponseRow[],
    personas,
  );
}

export async function getEvaluationSummaries(): Promise<EvaluationSummary[]> {
  const workspaceId = process.env.DEFAULT_WORKSPACE_ID;
  const supabase = getSupabaseServerClient();

  if (!workspaceId || !supabase) {
    return evaluationSummaries;
  }

  const { data, error } = await supabase
    .from("evaluations")
    .select(
      "id, title, feature_description, decision, decision_summary, created_at, status, selected_persona_ids",
    )
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  if (error || !data) {
    return evaluationSummaries;
  }

  return (data as EvaluationRow[])
    .filter((row) => row.status !== "pending" && row.status !== "running")
    .map((row) => ({
      id: row.id,
      title: row.title ?? deriveTitle(row.feature_description),
      verdict: row.decision ?? "risky",
      createdAt: formatRelativeTime(row.created_at),
      summary: row.decision_summary ?? "",
      selectedPersonaIds: asMaybeStringArray(row.selected_persona_ids),
    }));
}

export async function getEvaluationDetail(
  id: string,
): Promise<EvaluationRuntimeDetail | null> {
  const databaseDetail = await fetchEvaluationFromDatabase(id);
  if (databaseDetail) {
    return databaseDetail;
  }

  const summary = evaluationSummaries.find((item) => item.id === id) ?? null;
  const result = evaluationResults[id];
  const draft = evaluationDrafts[id];

  if (!summary || !result) {
    return null;
  }

  const personas = await getPersonasByIds(
    result.personas.map((personaEvaluation) => personaEvaluation.persona_id),
    { fallbackToMock: true },
  );
  const personaMap = new Map(personas.map((persona) => [persona.id, persona]));

  const personaEvaluations = result.personas
    .map((evaluation) => {
      const persona = personaMap.get(evaluation.persona_id);
      if (!persona) {
        return null;
      }

      return {
        persona,
        status: "completed" as const,
        evaluation,
        errorMessage: null,
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  return {
    id: summary.id,
    title: summary.title,
    feature_description: draft?.idea ?? summary.summary,
    status: "completed",
    stage: "Finalizing recommendations",
    errorMessage: null,
    startedAt: null,
    completedAt: null,
    decision: result.decision,
    decision_summary: result.decision_summary,
    why: result.why,
    top_fixes: result.top_fixes,
    confidence: calculatePanelScore(personaEvaluations),
    selectedPersonaIds: result.personas.map((personaEvaluation) => personaEvaluation.persona_id),
    personaEvaluations,
  };
}

export async function getEvaluationDraftById(
  id?: string,
): Promise<EvaluationDraft> {
  if (!id) {
    return evaluationDrafts.blank;
  }

  const workspaceId = process.env.DEFAULT_WORKSPACE_ID;
  const supabase = getSupabaseServerClient();

  if (workspaceId && supabase) {
    const { data: evaluationRow } = await supabase
      .from("evaluations")
      .select("id, feature_description")
      .eq("id", id)
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    if (evaluationRow) {
      const { data: responseRows } = await supabase
        .from("evaluation_persona_responses")
        .select("persona_id")
        .eq("evaluation_id", id);

      return {
        id: evaluationRow.id,
        idea: evaluationRow.feature_description,
        selectedPersonaIds: responseRows?.map((row) => row.persona_id) ?? [],
      };
    }
  }

  return evaluationDrafts[id] ?? evaluationDrafts.blank;
}
