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
  PaginatedResult,
} from "@/lib/types";

type DataViewer = {
  userId: string;
  isAdmin: boolean;
};

type UntypedArrayResult = {
  data: unknown[] | null;
  count?: number | null;
  error: { message: string } | null;
};

type UntypedSingleResult = {
  data: unknown | null;
  error: { message: string } | null;
};

type UntypedQuery = PromiseLike<UntypedArrayResult> & {
  eq(column: string, value: unknown): UntypedQuery;
  in(column: string, values: unknown[]): UntypedQuery;
  order(column: string, options?: Record<string, unknown>): UntypedQuery;
  range(from: number, to: number): UntypedQuery;
  maybeSingle(): Promise<UntypedSingleResult>;
};

type UntypedTable = {
  select(columns: string, options?: Record<string, unknown>): UntypedQuery;
};

type EvaluationRow = Pick<
  EvaluationRecord,
  | "id"
  | "owner_id"
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

const EVALUATION_DETAIL_COLUMNS = [
  "id",
  "owner_id",
  "title",
  "feature_description",
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
  "created_at",
].join(", ");

function fromTable(
  supabase: NonNullable<ReturnType<typeof getSupabaseServerClient>>,
  relation: string,
) {
  return supabase.from(relation) as unknown as UntypedTable;
}

function scopeEvaluationQuery(
  query: UntypedQuery,
  viewer?: DataViewer,
) {
  if (!viewer || viewer.isAdmin) {
    return query;
  }

  return query.eq("owner_id", viewer.userId);
}

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
    Array.isArray(candidate.why_i_push_back) &&
    candidate.why_i_push_back.every((item) => typeof item === "string") &&
    Array.isArray(candidate.this_fails_if) &&
    candidate.this_fails_if.every((item) => typeof item === "string") &&
    typeof candidate.hidden_assumption === "string" &&
    Array.isArray(candidate.questions_for_pm) &&
    candidate.questions_for_pm.every((item) => typeof item === "string") &&
    typeof candidate.what_would_change_my_mind === "string"
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

function emptyPage<T>(offset: number): PaginatedResult<T> {
  return {
    items: [],
    total: 0,
    hasMore: false,
    nextOffset: offset,
  };
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
    why_i_push_back: [
      row.top_concern || `It may still add friction around ${primaryFrustration.toLowerCase()}.`,
      `I need to know whether this helps or slows down ${primaryGoal.toLowerCase()}.`,
    ],
    this_fails_if: [
      `This fails if it adds a second workflow before showing a clear decision.`,
      `This fails if the first useful result takes more than a few minutes to produce.`,
    ],
    hidden_assumption: `It assumes ${roleLabel} will trust a panel result enough to use it in decision-making.`,
    questions_for_pm: [
      `How does this help a ${roleLabel} make faster decisions?`,
      `What would stop ${primaryFrustration.toLowerCase()} from becoming a blocker?`,
      `What is the smallest version that proves value for teams focused on ${primaryLens.toLowerCase()}?`,
    ],
    what_would_change_my_mind:
      `Show a result that cuts down rework for ${roleLabel} without adding extra review steps.`,
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
      why_i_push_back: details.why_i_push_back.length
        ? details.why_i_push_back
        : fallbackDetails.why_i_push_back,
      this_fails_if: details.this_fails_if.length
        ? details.this_fails_if
        : fallbackDetails.this_fails_if,
      hidden_assumption: details.hidden_assumption || fallbackDetails.hidden_assumption,
      questions_for_pm: details.questions_for_pm.length
        ? details.questions_for_pm
        : fallbackDetails.questions_for_pm,
      what_would_change_my_mind:
        details.what_would_change_my_mind || fallbackDetails.what_would_change_my_mind,
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
    ownerId: evaluationRow.owner_id,
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
  viewer?: DataViewer,
): Promise<EvaluationRuntimeDetail | null> {
  const workspaceId = process.env.DEFAULT_WORKSPACE_ID;
  const supabase = getSupabaseServerClient();

  if (!workspaceId || !supabase) {
    return null;
  }

  const evaluationQuery = scopeEvaluationQuery(
    fromTable(supabase, "evaluations")
      .select(EVALUATION_DETAIL_COLUMNS)
      .eq("id", id)
      .eq("workspace_id", workspaceId),
    viewer,
  )
    .maybeSingle();

  const { data: evaluationRow, error: evaluationError } = await evaluationQuery;

  if (evaluationError || !evaluationRow) {
    return null;
  }

  const { data: responseRows, error: responseError } = await fromTable(
    supabase,
    "evaluation_persona_responses",
  )
    .select("*")
    .eq("evaluation_id", id)
    .order("created_at", { ascending: true });

  if (responseError || !responseRows) {
    return null;
  }

  const selectedPersonaIds = asMaybeStringArray(
    (evaluationRow as unknown as EvaluationRow).selected_persona_ids,
  );
  const responsePersonaIds = (responseRows as unknown as EvaluationPersonaResponseRow[]).map(
    (row) => row.persona_id,
  );
  const personaIds = selectedPersonaIds.length ? selectedPersonaIds : responsePersonaIds;

  const personas = await getPersonasByIds(personaIds, {
    fallbackToMock: true,
    viewer,
  });

  return buildRuntimeDetailFromRows(
    evaluationRow as unknown as EvaluationRow,
    responseRows as unknown as EvaluationPersonaResponseRow[],
    personas,
  );
}

export async function getEvaluationSummaries(): Promise<EvaluationSummary[]> {
  const page = await getEvaluationSummariesPage();
  return page.items;
}

export async function getEvaluationSummariesPage({
  limit = 8,
  offset = 0,
  viewer,
}: {
  limit?: number;
  offset?: number;
  viewer?: DataViewer;
} = {}): Promise<PaginatedResult<EvaluationSummary>> {
  const workspaceId = process.env.DEFAULT_WORKSPACE_ID;
  const supabase = getSupabaseServerClient();

  if (!workspaceId || !supabase) {
    if (viewer) {
      return emptyPage(offset);
    }

    const items = evaluationSummaries.slice(offset, offset + limit);
    return {
      items,
      total: evaluationSummaries.length,
      hasMore: offset + items.length < evaluationSummaries.length,
      nextOffset: offset + items.length,
    };
  }

  const query = scopeEvaluationQuery(
    fromTable(supabase, "evaluations")
      .select(
        "id, owner_id, title, feature_description, decision, decision_summary, created_at, status, selected_persona_ids",
        { count: "exact" },
      )
      .eq("workspace_id", workspaceId),
    viewer,
  )
    .in("status", ["completed", "partial_error", "failed"])
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  const { data, count, error } = await query;

  if (error || !data) {
    if (viewer) {
      return emptyPage(offset);
    }

    const items = evaluationSummaries.slice(offset, offset + limit);
    return {
      items,
      total: evaluationSummaries.length,
      hasMore: offset + items.length < evaluationSummaries.length,
      nextOffset: offset + items.length,
    };
  }

  const rows = data as EvaluationRow[];
  const items = rows.map((row) => ({
    id: row.id,
    title: row.title ?? deriveTitle(row.feature_description),
    verdict: row.decision ?? "risky",
    createdAt: formatRelativeTime(row.created_at),
    summary: row.decision_summary ?? "",
    selectedPersonaIds: asMaybeStringArray(row.selected_persona_ids),
  }));

  return {
    items,
    total: count ?? rows.length,
    hasMore: offset + items.length < (count ?? rows.length),
    nextOffset: offset + items.length,
  };
}

export async function getEvaluationDetail(
  id: string,
  options: { viewer?: DataViewer } = {},
): Promise<EvaluationRuntimeDetail | null> {
  const databaseDetail = await fetchEvaluationFromDatabase(id, options.viewer);
  if (databaseDetail) {
    return databaseDetail;
  }

  if (options.viewer) {
    return null;
  }

  const summary = evaluationSummaries.find((item) => item.id === id) ?? null;
  const result = evaluationResults[id];
  const draft = evaluationDrafts[id];

  if (!summary || !result) {
    return null;
  }

  const personas = await getPersonasByIds(
    result.personas.map((personaEvaluation) => personaEvaluation.persona_id),
    { fallbackToMock: true, viewer: options.viewer },
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
    ownerId: null,
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
  options: { viewer?: DataViewer } = {},
): Promise<EvaluationDraft> {
  if (!id) {
    return evaluationDrafts.blank;
  }

  const workspaceId = process.env.DEFAULT_WORKSPACE_ID;
  const supabase = getSupabaseServerClient();

  if (workspaceId && supabase) {
    const draftQuery = scopeEvaluationQuery(
      fromTable(supabase, "evaluations")
        .select("id, feature_description, selected_persona_ids")
        .eq("id", id)
        .eq("workspace_id", workspaceId),
      options.viewer,
    )
      .maybeSingle();

    const { data: evaluationRow } = await draftQuery;

    if (evaluationRow) {
      const row = evaluationRow as {
        id?: unknown;
        feature_description?: unknown;
        selected_persona_ids?: unknown;
      };
      const { data: responseRows } = await fromTable(
        supabase,
        "evaluation_persona_responses",
      )
        .select("persona_id")
        .eq("evaluation_id", id);

      const selectedPersonaIds = asMaybeStringArray(
        row.selected_persona_ids,
      );
      const responsePersonaIds = Array.isArray(responseRows)
        ? responseRows
            .map((responseRow) =>
              typeof (responseRow as { persona_id?: unknown }).persona_id === "string"
                ? (responseRow as { persona_id: string }).persona_id
                : null,
            )
            .filter((personaId): personaId is string => Boolean(personaId))
        : [];

      return {
        id: typeof row.id === "string" ? row.id : id,
        idea:
          typeof row.feature_description === "string"
            ? row.feature_description
            : evaluationDrafts.blank.idea,
        selectedPersonaIds: selectedPersonaIds.length
          ? selectedPersonaIds
          : responsePersonaIds,
      };
    }
  }

  return options.viewer ? evaluationDrafts.blank : evaluationDrafts[id] ?? evaluationDrafts.blank;
}
