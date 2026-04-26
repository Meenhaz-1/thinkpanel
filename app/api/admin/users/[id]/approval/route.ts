import { NextResponse } from "next/server";

import { authErrorResponse, requireAdmin } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase-server";

type ApprovalRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type ApprovalBody = {
  approval_status?: unknown;
};

export async function PATCH(req: Request, context: ApprovalRouteContext) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch (error) {
    return authErrorResponse(error);
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Missing Supabase config" },
      { status: 500 },
    );
  }

  let body: ApprovalBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  if (body.approval_status !== "approved" && body.approval_status !== "rejected") {
    return NextResponse.json(
      { error: "approval_status must be approved or rejected" },
      { status: 400 },
    );
  }

  const { id } = await context.params;
  const now = new Date().toISOString();
  const update =
    body.approval_status === "approved"
      ? {
          approval_status: "approved",
          approved_at: now,
          approved_by: admin.user.id,
          rejected_at: null,
          rejected_by: null,
          updated_at: now,
        }
      : {
          approval_status: "rejected",
          rejected_at: now,
          rejected_by: admin.user.id,
          approved_at: null,
          approved_by: null,
          updated_at: now,
        };

  const { data, error } = await supabase
    .from("user_profiles")
    .update(update)
    .eq("id", id)
    .eq("role", "user")
    .select("id")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Failed to update user approval" },
      { status: 500 },
    );
  }

  const updatedUser = data as { id?: unknown };
  const updatedUserId = typeof updatedUser.id === "string" ? updatedUser.id : id;
  return NextResponse.json({ user_id: updatedUserId });
}
