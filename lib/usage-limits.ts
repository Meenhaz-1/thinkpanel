import "server-only";

import type { AuthContext } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase-server";

export type UsageEventType = "persona_save" | "evaluation_generation";

const USAGE_LIMIT_PER_24_HOURS = 3;

const usageLimitMessages: Record<UsageEventType, string> = {
  persona_save:
    "You've reached the 3 persona saves limit for the last 24 hours. Try again later.",
  evaluation_generation:
    "You've reached the 3 evaluation generations limit for the last 24 hours. Try again later.",
};

export class UsageLimitError extends Error {
  status = 429;
  code = "usage_limit_exceeded";

  constructor(eventType: UsageEventType) {
    super(usageLimitMessages[eventType]);
    this.name = "UsageLimitError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export async function enforceUsageLimit(
  auth: AuthContext,
  eventType: UsageEventType,
) {
  if (auth.isAdmin) {
    return;
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    throw new Error("Missing Supabase config");
  }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count, error } = await supabase
    .from("usage_events")
    .select("id", { count: "exact", head: true })
    .eq("user_id", auth.user.id)
    .eq("event_type", eventType)
    .gte("created_at", since);

  if (error) {
    throw error;
  }

  if ((count ?? 0) >= USAGE_LIMIT_PER_24_HOURS) {
    throw new UsageLimitError(eventType);
  }
}

export async function recordUsageEvent({
  userId,
  eventType,
  entityId,
}: {
  userId: string;
  eventType: UsageEventType;
  entityId: string;
}) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return;
  }

  await supabase.from("usage_events").insert({
    user_id: userId,
    event_type: eventType,
    entity_id: entityId,
  });
}

export function usageLimitResponse(error: unknown) {
  if (error instanceof UsageLimitError) {
    return Response.json(
      {
        error: error.message,
        code: error.code,
      },
      { status: error.status },
    );
  }

  return null;
}
