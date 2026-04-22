import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageContainer } from "@/components/ui/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { SectionHeader } from "@/components/ui/section-header";
import { PersonaAvatar } from "@/components/personas/persona-avatar";
import { getPersonas } from "@/lib/get-personas";
import { getEvaluationSummaries } from "@/lib/get-evaluations";

export default async function DashboardPage() {
  const personas = await getPersonas();
  const evaluationSummaries = await getEvaluationSummaries();

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

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <section className="space-y-4">
          <SectionHeader title="Recent Evaluations" />
          {evaluationSummaries.length ? (
            <div className="space-y-4">
              {evaluationSummaries.map((evaluation) => (
                <Card key={evaluation.id} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-2">
                    <h2 className="font-display text-2xl font-bold text-foreground">
                      {evaluation.title}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {evaluation.summary}
                    </p>
                    <p className="text-sm text-muted-foreground">{evaluation.createdAt}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge verdict={evaluation.verdict} />
                    <Button variant="outline" href={`/evaluations/${evaluation.id}`}>
                      View
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Run your first evaluation"
              description="There are no evaluations yet. Start with one idea and a small panel of personas."
              action={<Button href="/evaluations/new">New Evaluation</Button>}
            />
          )}
        </section>

        <section className="space-y-4">
          <SectionHeader title="Saved Personas" />
          {personas.length ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
              {personas.map((persona) => (
                <Link
                  key={persona.id}
                  href={`/personas/${persona.id}`}
                  className="block"
                  aria-label={`Edit ${persona.name}`}
                >
                  <Card
                    tone="muted"
                    className="space-y-2 transition-all duration-150 hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-[0_18px_36px_-28px_rgba(93,63,211,0.28)]"
                  >
                    <div className="flex items-center gap-3">
                      <PersonaAvatar name={persona.name} size="sm" />
                      <div className="min-w-0">
                        <p className="truncate font-display text-xl font-bold text-foreground">
                          {persona.name}
                        </p>
                        <p className="truncate text-sm text-muted-foreground">
                          {persona.role}
                        </p>
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Create personas to begin"
              description="Create personas to simulate different perspectives."
              action={<Button href="/personas/new">Create Persona</Button>}
            />
          )}
        </section>
      </div>
    </PageContainer>
  );
}
