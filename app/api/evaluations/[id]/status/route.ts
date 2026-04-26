import { NextResponse } from "next/server";

import { getEvaluationDetail } from "@/lib/get-evaluations";
import { authErrorResponse, requireApprovedUser } from "@/lib/auth";

type StatusRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_req: Request, context: StatusRouteContext) {
  let auth;
  try {
    auth = await requireApprovedUser();
  } catch (error) {
    return authErrorResponse(error);
  }

  const { id } = await context.params;
  const evaluation = await getEvaluationDetail(id, { viewer: auth.viewer });

  if (!evaluation) {
    return NextResponse.json(
      { error: "Evaluation not found" },
      { status: 404 },
    );
  }

  return NextResponse.json({ evaluation });
}
