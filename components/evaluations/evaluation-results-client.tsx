"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { PersonaResultCard } from "@/components/evaluations/persona-result-card";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageContainer } from "@/components/ui/page-container";
import type { EvaluationRuntimeDetail } from "@/lib/types";
import { cn } from "@/lib/utils";

const POLL_INTERVAL_MS = 2500;
const SLOW_THRESHOLD_MS = 8000;

type EvaluationResultsClientProps = {
  initialEvaluation: EvaluationRuntimeDetail;
};

function SkeletonLine({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-full bg-surface-panel-strong/80", className)} />;
}

function StageBanner({
  status,
  stage,
  isSlow,
  errorMessage,
}: {
  status: EvaluationRuntimeDetail["status"];
  stage: EvaluationRuntimeDetail["stage"];
  isSlow: boolean;
  errorMessage: string | null;
}) {
  const isTerminal = status === "completed" || status === "partial_error" || status === "failed";
  const stageLabel = stage ?? "Preparing panel";

  const message = (() => {
    if (status === "failed") {
      return errorMessage ?? "The panel could not finish.";
    }

    if (status === "partial_error") {
      return "Some persona saves failed, but the panel output is still usable.";
    }

    if (isTerminal) {
      return "Panel complete.";
    }

    if (isSlow) {
      return "Still evaluating your panel.";
    }

    if (status === "running") {
      return "The panel is running in the background.";
    }

    return "Preparing your panel.";
  })();

  return (
    <Card tone="muted" className="space-y-3 rounded-[28px] border-border-subtle bg-surface-panel/80 px-5 py-4 shadow-none">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
          {stageLabel}
        </span>
        {status === "failed" ? (
          <span className="rounded-full bg-verdict-reject-bg px-3 py-1 text-xs font-semibold text-verdict-reject-text">
            Failed
          </span>
        ) : status === "partial_error" ? (
          <span className="rounded-full bg-verdict-risky-bg px-3 py-1 text-xs font-semibold text-verdict-risky-text">
            Partial error
          </span>
        ) : null}
      </div>
      <p className="text-sm leading-6 text-foreground/90">{message}</p>
    </Card>
  );
}

function VerdictSkeleton() {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <SkeletonLine className="h-7 w-24 rounded-full" />
      </div>
      <div className="space-y-4">
        <SkeletonLine className="h-16 w-[40%] rounded-2xl" />
        <div className="space-y-3">
          <SkeletonLine className="h-5 w-full" />
          <SkeletonLine className="h-5 w-[84%]" />
        </div>
        <SkeletonLine className="h-4 w-40" />
      </div>
    </div>
  );
}

function EmptySectionSkeleton() {
  return (
    <div className="space-y-4">
      <SkeletonLine className="h-4 w-32" />
      <div className="space-y-3">
        <SkeletonLine className="h-4 w-full" />
        <SkeletonLine className="h-4 w-[90%]" />
        <SkeletonLine className="h-4 w-[82%]" />
      </div>
    </div>
  );
}

export function EvaluationResultsClient({
  initialEvaluation,
}: EvaluationResultsClientProps) {
  const [evaluation, setEvaluation] = useState(initialEvaluation);
  const [executeError, setExecuteError] = useState<string | null>(
    initialEvaluation.status === "failed" ? initialEvaluation.errorMessage : null,
  );
  const [isExecuting, setIsExecuting] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const executionStartedRef = useRef(false);
  const terminal =
    evaluation.status === "completed" ||
    evaluation.status === "partial_error" ||
    evaluation.status === "failed";

  useEffect(() => {
    if (terminal || !evaluation.startedAt) {
      return;
    }

    const update = () => {
      setNow(Date.now());
    };

    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [evaluation.startedAt, terminal]);

  const isSlow =
    !terminal && evaluation.startedAt
      ? now - new Date(evaluation.startedAt).getTime() > SLOW_THRESHOLD_MS
      : false;

  const refreshStatus = useCallback(async () => {
    const response = await fetch(`/api/evaluations/${evaluation.id}/status`, {
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error("Failed to refresh evaluation.");
    }

    const data: { evaluation?: EvaluationRuntimeDetail; error?: string } = await response.json();
    if (!data.evaluation) {
      throw new Error(data.error ?? "Failed to refresh evaluation.");
    }

    setEvaluation(data.evaluation);
    return data.evaluation;
  }, [evaluation.id]);

  const runEvaluation = useCallback(async () => {
    if (isExecuting) {
      return;
    }

    setIsExecuting(true);
    setExecuteError(null);

    try {
      const response = await fetch("/api/evaluations/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ evaluation_id: evaluation.id }),
      });

      const data: { evaluation_id?: string; error?: string } = await response.json();
      if (!response.ok || !data.evaluation_id) {
        throw new Error(data.error ?? "Failed to run evaluation.");
      }

      await refreshStatus();
    } catch (error) {
      setExecuteError(
        error instanceof Error ? error.message : "Failed to run evaluation.",
      );
      await refreshStatus().catch(() => undefined);
    } finally {
      setIsExecuting(false);
    }
  }, [evaluation.id, isExecuting, refreshStatus]);

  useEffect(() => {
    if (evaluation.status === "pending") {
      if (!executionStartedRef.current) {
        executionStartedRef.current = true;
        void runEvaluation();
      }
    }
  }, [evaluation.status, runEvaluation]);

  useEffect(() => {
    if (terminal) {
      return;
    }

    const timer = window.setInterval(() => {
      void refreshStatus().catch(() => undefined);
    }, POLL_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [terminal, evaluation.id, refreshStatus]);

  const panelScore = evaluation.confidence ?? 0;

  const showSkeletons =
    evaluation.status === "pending" || evaluation.status === "running";
  const isFailed =
    evaluation.status === "failed" ||
    (!!executeError &&
      evaluation.status !== "completed" &&
      evaluation.status !== "partial_error");
  const firstOpenIndex = 0;

  return (
    <PageContainer className="space-y-10">
      <PageHeader
        eyebrow="Evaluations"
        title={evaluation.title}
        description={evaluation.feature_description}
        actions={
          <>
            <Button
              href={`/evaluations/new?draft=${encodeURIComponent(evaluation.id)}`}
              variant="outline"
            >
              Edit &amp; Re-run
            </Button>
          </>
        }
      />

      <div className="space-y-4">
        <StageBanner
          status={evaluation.status}
          stage={evaluation.stage}
          isSlow={isSlow}
          errorMessage={executeError ?? evaluation.errorMessage}
        />

        <Card className="space-y-8 rounded-[32px] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(245,241,255,0.96))] p-8 md:min-h-[320px] md:p-10">
          {isFailed ? (
            <div className="space-y-4">
              <span className="inline-flex items-center rounded-full bg-verdict-reject-bg px-3 py-1 text-xs font-semibold text-verdict-reject-text">
                Failed
              </span>
              <h2 className="font-display text-6xl font-extrabold tracking-tight text-foreground md:text-7xl">
                Evaluation failed
              </h2>
              <p className="max-w-3xl text-lg leading-8 text-foreground">
                {executeError ?? evaluation.errorMessage ?? "We could not finish this panel."}
              </p>
              <div className="flex flex-wrap gap-3">
                <Button onClick={() => void runEvaluation()} disabled={isExecuting}>
                  {isExecuting ? "Retrying..." : "Retry evaluation"}
                </Button>
                <Button
                  href={`/evaluations/new?draft=${encodeURIComponent(evaluation.id)}`}
                  variant="outline"
                >
                  Edit &amp; Re-run
                </Button>
              </div>
            </div>
          ) : showSkeletons ? (
            <VerdictSkeleton />
          ) : (
            <div className="space-y-4">
              <Badge verdict={evaluation.decision ?? "risky"} className="text-sm" />
              <h2 className="font-display text-6xl font-extrabold tracking-tight text-foreground md:text-7xl">
                {evaluation.decision === "ship"
                  ? "Ship"
                  : evaluation.decision === "risky"
                    ? "Risky"
                    : "Do Not Proceed"}
              </h2>
              <p className="max-w-3xl text-lg leading-8 text-foreground">
                {evaluation.decision_summary ?? "The panel finished with partial results."}
              </p>
              <p className="text-sm font-medium text-muted-foreground">
                Panel score {panelScore ?? 0}/100
              </p>
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-2">
            <Card tone="muted" className="space-y-3 min-h-[210px] shadow-none">
              <h3 className="font-display text-2xl font-bold text-foreground">Why</h3>
              {showSkeletons ? (
                <EmptySectionSkeleton />
              ) : isFailed ? (
                <p className="text-sm leading-6 text-muted-foreground">
                  This section will populate once the panel completes successfully.
                </p>
              ) : (
                <ul className="space-y-3 text-sm leading-6 text-foreground">
                  {evaluation.why.map((item) => (
                    <li key={item} className="flex gap-3">
                      <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card tone="muted" className="space-y-3 min-h-[210px] shadow-none">
              <h3 className="font-display text-2xl font-bold text-foreground">Top Fixes</h3>
              {showSkeletons ? (
                <EmptySectionSkeleton />
              ) : isFailed ? (
                <p className="text-sm leading-6 text-muted-foreground">
                  No fixes are available because the run did not complete.
                </p>
              ) : (
                <ul className="space-y-3 text-sm leading-6 text-foreground">
                  {evaluation.top_fixes.map((item) => (
                    <li key={item} className="flex gap-3">
                      <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </Card>
      </div>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-display text-3xl font-bold text-foreground">
              Persona Breakdown
            </h3>
            <p className="text-sm text-muted-foreground">
              Each card is useful before expansion. Open a card only for the key concern and next step.
            </p>
          </div>
        </div>

        <div className="space-y-5">
          {evaluation.personaEvaluations.map((personaEvaluation, index) => (
            <PersonaResultCard
              key={personaEvaluation.persona.id}
              personaEvaluation={personaEvaluation}
              defaultOpen={index === firstOpenIndex}
              onRetry={() => void runEvaluation()}
            />
          ))}
        </div>
      </section>
    </PageContainer>
  );
}
