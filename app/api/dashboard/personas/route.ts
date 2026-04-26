import { NextResponse } from "next/server";

import { getPersonasPage } from "@/lib/get-personas";
import { authErrorResponse, requireApprovedUser } from "@/lib/auth";

function readNumber(value: string | null, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

export async function GET(request: Request) {
  let auth;
  try {
    auth = await requireApprovedUser();
  } catch (error) {
    return authErrorResponse(error);
  }

  const url = new URL(request.url);
  const limit = readNumber(url.searchParams.get("limit"), 8);
  const offset = readNumber(url.searchParams.get("offset"), 0);

  const page = await getPersonasPage({ limit, offset, viewer: auth.viewer });
  return NextResponse.json(page);
}
