import { PageHeader } from "@/components/layout/page-header";
import { NewEvaluationForm } from "@/components/evaluations/new-evaluation-form";
import { PageContainer } from "@/components/ui/page-container";
import { getPersonas } from "@/lib/get-personas";
import { getEvaluationDraftById } from "@/lib/get-evaluations";

type NewEvaluationPageProps = {
  searchParams: Promise<{
    draft?: string;
  }>;
};

export default async function NewEvaluationPage({
  searchParams,
}: NewEvaluationPageProps) {
  const { draft } = await searchParams;
  const initialDraft = await getEvaluationDraftById(draft);
  const personas = await getPersonas();

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Evaluations"
        title="New Evaluation"
        description="Describe the idea, pick the personas, and run the panel."
      />
      <NewEvaluationForm personas={personas} initialDraft={initialDraft} />
    </PageContainer>
  );
}
