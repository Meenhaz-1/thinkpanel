import { notFound } from "next/navigation";

import { EvaluationResultsClient } from "@/components/evaluations/evaluation-results-client";
import { getEvaluationDetail } from "@/lib/get-evaluations";
import { requireApprovedUser } from "@/lib/auth";

type EvaluationDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EvaluationDetailPage({
  params,
}: EvaluationDetailPageProps) {
  const auth = await requireApprovedUser({ touch: false });
  const { id } = await params;
  const evaluation = await getEvaluationDetail(id, { viewer: auth.viewer });

  if (!evaluation) {
    notFound();
  }

  return <EvaluationResultsClient initialEvaluation={evaluation} />;
}
