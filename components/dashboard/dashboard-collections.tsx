"use client";

import { useState } from "react";
import Link from "next/link";

import { PersonaAvatar } from "@/components/personas/persona-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionHeader } from "@/components/ui/section-header";
import type { EvaluationSummary, PaginatedResult, Persona } from "@/lib/types";

type DashboardCollectionsProps = {
  initialPersonas: PaginatedResult<Persona>;
  initialEvaluations: PaginatedResult<EvaluationSummary>;
};

const PAGE_SIZE = 8;

export function DashboardCollections({
  initialPersonas,
  initialEvaluations,
}: DashboardCollectionsProps) {
  const [personas, setPersonas] = useState(initialPersonas.items);
  const [evaluationSummaries, setEvaluationSummaries] = useState(
    initialEvaluations.items,
  );
  const [personaMeta, setPersonaMeta] = useState({
    hasMore: initialPersonas.hasMore,
    nextOffset: initialPersonas.nextOffset,
    loading: false,
    error: null as string | null,
  });
  const [evaluationMeta, setEvaluationMeta] = useState({
    hasMore: initialEvaluations.hasMore,
    nextOffset: initialEvaluations.nextOffset,
    loading: false,
    error: null as string | null,
  });

  async function loadMorePersonas() {
    if (personaMeta.loading || !personaMeta.hasMore) {
      return;
    }

    setPersonaMeta((currentValue) => ({ ...currentValue, loading: true, error: null }));

    try {
      const response = await fetch(
        `/api/dashboard/personas?limit=${PAGE_SIZE}&offset=${personaMeta.nextOffset}`,
        { cache: "no-store" },
      );
      const data: PaginatedResult<Persona> & { error?: string } = await response.json();

      if (!response.ok || !Array.isArray(data.items)) {
        throw new Error(data.error ?? "Failed to load more personas.");
      }

      setPersonas((currentValue) => [...currentValue, ...data.items]);
      setPersonaMeta({
        hasMore: data.hasMore,
        nextOffset: data.nextOffset,
        loading: false,
        error: null,
      });
    } catch (error) {
      setPersonaMeta((currentValue) => ({
        ...currentValue,
        loading: false,
        error:
          error instanceof Error ? error.message : "Failed to load more personas.",
      }));
    }
  }

  async function loadMoreEvaluations() {
    if (evaluationMeta.loading || !evaluationMeta.hasMore) {
      return;
    }

    setEvaluationMeta((currentValue) => ({ ...currentValue, loading: true, error: null }));

    try {
      const response = await fetch(
        `/api/dashboard/evaluations?limit=${PAGE_SIZE}&offset=${evaluationMeta.nextOffset}`,
        { cache: "no-store" },
      );
      const data: PaginatedResult<EvaluationSummary> & { error?: string } =
        await response.json();

      if (!response.ok || !Array.isArray(data.items)) {
        throw new Error(data.error ?? "Failed to load more evaluations.");
      }

      setEvaluationSummaries((currentValue) => [...currentValue, ...data.items]);
      setEvaluationMeta({
        hasMore: data.hasMore,
        nextOffset: data.nextOffset,
        loading: false,
        error: null,
      });
    } catch (error) {
      setEvaluationMeta((currentValue) => ({
        ...currentValue,
        loading: false,
        error:
          error instanceof Error ? error.message : "Failed to load more evaluations.",
      }));
    }
  }

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
      <section className="space-y-4">
        <SectionHeader title="Recent Evaluations" />
        {evaluationSummaries.length ? (
          <div className="space-y-4">
            {evaluationSummaries.map((evaluation) => (
              <Card
                key={evaluation.id}
                className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
              >
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

        {evaluationMeta.error ? (
          <p className="text-sm font-medium text-verdict-reject-text">
            {evaluationMeta.error}
          </p>
        ) : null}

        {evaluationMeta.hasMore ? (
          <div>
            <Button variant="outline" onClick={loadMoreEvaluations} disabled={evaluationMeta.loading}>
              {evaluationMeta.loading ? "Loading..." : "Load more"}
            </Button>
          </div>
        ) : null}
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

        {personaMeta.error ? (
          <p className="text-sm font-medium text-verdict-reject-text">
            {personaMeta.error}
          </p>
        ) : null}

        {personaMeta.hasMore ? (
          <div>
            <Button variant="outline" onClick={loadMorePersonas} disabled={personaMeta.loading}>
              {personaMeta.loading ? "Loading..." : "Load more"}
            </Button>
          </div>
        ) : null}
      </section>
    </div>
  );
}
