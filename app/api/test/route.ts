import { NextResponse } from "next/server";

import { authErrorResponse, requireApprovedUser } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";

export async function GET() {
  try {
    await requireApprovedUser();
  } catch (error) {
    return authErrorResponse(error);
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json(
      { ok: false, message: "Missing Supabase config" },
      { status: 500 },
    );
  }

  const { count, error } = await supabase
    .from("personas")
    .select("*", { count: "exact", head: true });

  if (error) {
    return NextResponse.json(
      {
        ok: false,
        message: "Supabase query failed",
        error: error.message,
        code: error.code,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    message: "Supabase connected",
    table: "personas",
    rowCount: count ?? 0,
  });
}
