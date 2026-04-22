import { NextResponse } from "next/server";

import { supabase } from "@/lib/supabase";

export async function GET() {
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
