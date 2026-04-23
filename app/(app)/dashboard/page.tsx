import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/ui/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { DashboardCollections } from "@/components/dashboard/dashboard-collections";
import { getPersonasPage } from "@/lib/get-personas";
import { getEvaluationSummariesPage } from "@/lib/get-evaluations";

export default async function DashboardPage() {
  const personas = await getPersonasPage({ limit: 8, offset: 0 });
  const evaluationSummaries = await getEvaluationSummariesPage({ limit: 8, offset: 0 });

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Dashboard"
        title="Persona Panel"
        description="Create personas, run ideas through the panel, and get to a clear decision quickly."
        actions={
          <>
            <Button variant="secondary" href="/personas/new">
              Create Persona
            </Button>
            <Button href="/evaluations/new">New Evaluation</Button>
          </>
        }
      />
      <DashboardCollections
        initialPersonas={personas}
        initialEvaluations={evaluationSummaries}
      />
    </PageContainer>
  );
}
