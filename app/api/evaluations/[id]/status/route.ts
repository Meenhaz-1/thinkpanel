import { NextResponse } from "next/server";

import { getEvaluationDetail } from "@/lib/get-evaluations";

type StatusRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_req: Request, context: StatusRouteContext) {
  const { id } = await context.params;
  const evaluation = await getEvaluationDetail(id);

  if (!evaluation) {
    return NextResponse.json(
      { error: "Evaluation not found" },
      { status: 404 },
    );
  }

  return NextResponse.json({ evaluation });
}
