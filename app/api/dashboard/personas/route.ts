import { NextResponse } from "next/server";

import { getPersonasPage } from "@/lib/get-personas";

function readNumber(value: string | null, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const limit = readNumber(url.searchParams.get("limit"), 8);
  const offset = readNumber(url.searchParams.get("offset"), 0);

  const page = await getPersonasPage({ limit, offset });
  return NextResponse.json(page);
}

