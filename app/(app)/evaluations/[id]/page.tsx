import { notFound } from "next/navigation";

import { EvaluationResultsClient } from "@/components/evaluations/evaluation-results-client";
import { getEvaluationDetail } from "@/lib/get-evaluations";

type EvaluationDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EvaluationDetailPage({
  params,
}: EvaluationDetailPageProps) {
  const { id } = await params;
  const evaluation = await getEvaluationDetail(id);

  if (!evaluation) {
    notFound();
  }

  return <EvaluationResultsClient initialEvaluation={evaluation} />;
}
