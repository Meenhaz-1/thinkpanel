import { PageHeader } from "@/components/layout/page-header";
import { NewEvaluationForm } from "@/components/evaluations/new-evaluation-form";
import { PageContainer } from "@/components/ui/page-container";
import { getPersonas } from "@/lib/get-personas";
import { getEvaluationDraftById } from "@/lib/get-evaluations";
import { requireApprovedUser } from "@/lib/auth";

type NewEvaluationPageProps = {
  searchParams: Promise<{
    draft?: string;
  }>;
};

export default async function NewEvaluationPage({
  searchParams,
}: NewEvaluationPageProps) {
  const auth = await requireApprovedUser({ touch: false });
  const { draft } = await searchParams;
  const initialDraft = await getEvaluationDraftById(draft, {
    viewer: auth.viewer,
  });
  const personas = await getPersonas({ viewer: auth.viewer });

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Evaluations"
        title="New Evaluation"
        description="Describe the idea, attach optional images, pick three personas, and run the panel."
      />
      <NewEvaluationForm personas={personas} initialDraft={initialDraft} />
    </PageContainer>
  );
}
