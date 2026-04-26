import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase-server";

export type PendingUser = {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  createdAt: string;
};

export type AdminDashboardOverview = {
  pendingApprovals: number;
  activeUsersLast24h: number;
  personaSavesLast24h: number;
  evaluationGenerationsLast24h: number;
  pendingUsers: PendingUser[];
};

type PendingUserRow = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
};

function mapPendingUser(row: PendingUserRow): PendingUser {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    avatarUrl: row.avatar_url,
    createdAt: row.created_at,
  };
}

export async function getAdminDashboardOverview(): Promise<AdminDashboardOverview> {
  const supabase = getSupabaseAdminClient();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  if (!supabase) {
    return {
      pendingApprovals: 0,
      activeUsersLast24h: 0,
      personaSavesLast24h: 0,
      evaluationGenerationsLast24h: 0,
      pendingUsers: [],
    };
  }

  const [
    pendingApprovalsResult,
    activeUsersResult,
    personaSavesResult,
    evaluationGenerationsResult,
    pendingUsersResult,
  ] = await Promise.all([
    supabase
      .from("user_profiles")
      .select("id", { count: "exact", head: true })
      .eq("approval_status", "pending"),
    supabase
      .from("user_profiles")
      .select("id", { count: "exact", head: true })
      .eq("approval_status", "approved")
      .gte("last_seen_at", since),
    supabase
      .from("usage_events")
      .select("id", { count: "exact", head: true })
      .eq("event_type", "persona_save")
      .gte("created_at", since),
    supabase
      .from("usage_events")
      .select("id", { count: "exact", head: true })
      .eq("event_type", "evaluation_generation")
      .gte("created_at", since),
    supabase
      .from("user_profiles")
      .select("id, email, full_name, avatar_url, created_at")
      .eq("approval_status", "pending")
      .order("created_at", { ascending: true })
      .limit(10),
  ]);

  const pendingUsers = pendingUsersResult.error || !pendingUsersResult.data
    ? []
    : (pendingUsersResult.data as PendingUserRow[]).map(mapPendingUser);

  return {
    pendingApprovals: pendingApprovalsResult.count ?? 0,
    activeUsersLast24h: activeUsersResult.count ?? 0,
    personaSavesLast24h: personaSavesResult.count ?? 0,
    evaluationGenerationsLast24h: evaluationGenerationsResult.count ?? 0,
    pendingUsers,
  };
}
