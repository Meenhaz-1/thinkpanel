import { personas as mockPersonas } from "@/lib/mock-data";
import { normalizeEvaluationLens } from "@/lib/persona-evaluation-lens";
import type { PaginatedResult, Persona } from "@/lib/types";
import { getSupabaseServerClient } from "@/lib/supabase-server";

type DataViewer = {
  userId: string;
  isAdmin: boolean;
};

type UntypedQueryResult = {
  data: unknown[] | null;
  count?: number | null;
  error: { message: string } | null;
};

type UntypedQuery = PromiseLike<UntypedQueryResult> & {
  eq(column: string, value: unknown): UntypedQuery;
  in(column: string, values: unknown[]): UntypedQuery;
  order(column: string, options?: Record<string, unknown>): UntypedQuery;
  range(from: number, to: number): UntypedQuery;
};

type UntypedTable = {
  select(columns: string, options?: Record<string, unknown>): UntypedQuery;
};

type PersonaRow = {
  id: string;
  owner_id: string | null;
  name: string;
  role: string;
  summary: string;
  voice: string | null;
  goals: string[] | null;
  frustrations: string[] | null;
  evaluation_lens: unknown;
  created_at: string;
  updated_at: string | null;
  company_size: string | null;
  company_type: string | null;
  seniority: string | null;
  quote: string | null;
  generation_prompt: string | null;
  source_type: string | null;
};

function mapPersonaRow(row: PersonaRow): Persona {
  return {
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
    role: row.role,
    summary: row.summary,
    voice: row.voice ?? "",
    goals: row.goals ?? [],
    frustrations: row.frustrations ?? [],
    evaluationLens: normalizeEvaluationLens(row.evaluation_lens),
    companySize: row.company_size,
    companyType: row.company_type,
    seniority: row.seniority,
    quote: row.quote,
    generationPrompt: row.generation_prompt,
    sourceType: row.source_type,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? row.created_at,
  };
}

function sortByLastUpdated(personas: Persona[]) {
  return [...personas].sort((left, right) => {
    const leftTime = new Date(left.updatedAt ?? left.createdAt ?? 0).getTime();
    const rightTime = new Date(right.updatedAt ?? right.createdAt ?? 0).getTime();

    return rightTime - leftTime;
  });
}

function fromTable(
  supabase: NonNullable<ReturnType<typeof getSupabaseServerClient>>,
  relation: string,
) {
  return supabase.from(relation) as unknown as UntypedTable;
}

async function fetchPersonas(
  selectQuery: (supabase: NonNullable<ReturnType<typeof getSupabaseServerClient>>) => Promise<{
    data: unknown[] | null;
    error: { message: string } | null;
  }>,
): Promise<Persona[] | null> {
  const workspaceId = process.env.DEFAULT_WORKSPACE_ID;
  const supabase = getSupabaseServerClient();

  if (!workspaceId || !supabase) {
    return null;
  }

  try {
    const { data, error } = await selectQuery(supabase);

    if (error || !data) {
      return null;
    }

    return (data as PersonaRow[]).map(mapPersonaRow);
  } catch {
    return null;
  }
}

type PaginationOptions = {
  limit?: number;
  offset?: number;
  viewer?: DataViewer;
};

const PERSONA_SELECT_QUERY =
  "id, owner_id, name, role, summary, voice, goals, frustrations, evaluation_lens, company_size, company_type, seniority, quote, generation_prompt, source_type, created_at, updated_at";

function emptyPage<T>(offset: number): PaginatedResult<T> {
  return {
    items: [],
    total: 0,
    hasMore: false,
    nextOffset: offset,
  };
}

function scopePersonaQuery(
  query: UntypedQuery,
  viewer?: DataViewer,
) {
  if (!viewer || viewer.isAdmin) {
    return query;
  }

  return query.eq("owner_id", viewer.userId);
}

export async function getPersonas(options: PaginationOptions = {}): Promise<Persona[]> {
  const personas = await fetchPersonas(async (supabase) => {
    let query = scopePersonaQuery(
      fromTable(supabase, "personas")
        .select(PERSONA_SELECT_QUERY)
        .eq("workspace_id", process.env.DEFAULT_WORKSPACE_ID ?? ""),
      options.viewer,
    ).order("updated_at", { ascending: false });

    if (typeof options.limit === "number" || typeof options.offset === "number") {
      const from = options.offset ?? 0;
      const to = from + (options.limit ?? 0) - 1;
      query = query.range(from, to);
    }

    return query;
  });

  return sortByLastUpdated(personas ?? (options.viewer ? [] : mockPersonas));
}

export async function getPersonasPage({
  limit = 8,
  offset = 0,
  viewer,
}: PaginationOptions = {}): Promise<PaginatedResult<Persona>> {
  const workspaceId = process.env.DEFAULT_WORKSPACE_ID;
  const supabase = getSupabaseServerClient();

  if (!workspaceId || !supabase) {
    if (viewer) {
      return emptyPage(offset);
    }

    const items = sortByLastUpdated(mockPersonas).slice(offset, offset + limit);
    return {
      items,
      total: mockPersonas.length,
      hasMore: offset + items.length < mockPersonas.length,
      nextOffset: offset + items.length,
    };
  }

  const query = scopePersonaQuery(
    fromTable(supabase, "personas")
      .select(PERSONA_SELECT_QUERY, { count: "exact" })
      .eq("workspace_id", workspaceId),
    viewer,
  )
    .order("updated_at", { ascending: false })
    .range(offset, offset + limit - 1);

  const { data, count, error } = await query;

  if (error || !data) {
    if (viewer) {
      return emptyPage(offset);
    }

    const items = sortByLastUpdated(mockPersonas).slice(offset, offset + limit);
    return {
      items,
      total: mockPersonas.length,
      hasMore: offset + items.length < mockPersonas.length,
      nextOffset: offset + items.length,
    };
  }

  return {
    items: (data as PersonaRow[]).map(mapPersonaRow),
    total: count ?? data.length,
    hasMore: offset + data.length < (count ?? data.length),
    nextOffset: offset + data.length,
  };
}

export async function getPersonasByIds(
  ids: string[],
  options: { fallbackToMock?: boolean; viewer?: DataViewer } = {},
): Promise<Persona[]> {
  const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
  if (!uniqueIds.length) {
    return [];
  }

  const personas = await fetchPersonas(async (supabase) =>
    scopePersonaQuery(
      fromTable(supabase, "personas")
        .select(PERSONA_SELECT_QUERY)
        .in("id", uniqueIds)
        .eq("workspace_id", process.env.DEFAULT_WORKSPACE_ID ?? ""),
      options.viewer,
    ),
  );

  if (personas) {
    const personaMap = new Map(personas.map((persona) => [persona.id, persona]));
    return uniqueIds.flatMap((id) => {
      const persona = personaMap.get(id);
      return persona ? [persona] : [];
    });
  }

  if (!options.fallbackToMock || options.viewer) {
    return [];
  }

  const mockMap = new Map(mockPersonas.map((persona) => [persona.id, persona]));
  return uniqueIds.flatMap((id) => {
    const persona = mockMap.get(id);
    return persona ? [persona] : [];
  });
}
