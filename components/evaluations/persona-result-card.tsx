"use client";

import { PersonaAvatar } from "@/components/personas/persona-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { RuntimePersonaEvaluation } from "@/lib/types";

type PersonaResultCardProps = {
  personaEvaluation: RuntimePersonaEvaluation;
  defaultOpen?: boolean;
  onRetry?: () => void;
};

const metaLabels = [
  ["Role", "role"],
  ["Company", "company"],
  ["Device", "device"],
  ["Usage", "usage"],
  ["Eval lens", "evaluation_lens"],
] as const;

function getScoreBarClass(verdict: NonNullable<RuntimePersonaEvaluation["evaluation"]>["verdict"]) {
  switch (verdict) {
    case "love":
    case "like":
      return "bg-emerald-400";
    case "mixed":
      return "bg-amber-400";
    case "reject":
      return "bg-rose-400";
  }
}

function renderListItemTone(index: number, verdict: NonNullable<RuntimePersonaEvaluation["evaluation"]>["verdict"]) {
  if (verdict === "reject") {
    return "bg-rose-500";
  }

  if (verdict === "mixed") {
    return "bg-amber-500";
  }

  return index === 0 ? "bg-emerald-500" : "bg-emerald-400";
}

function SkeletonLine({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-full bg-surface-panel-strong/80", className)} />;
}

function PendingBody() {
  return (
    <div className="grid gap-6 xl:grid-cols-[220px_minmax(0,1fr)_320px]">
      <div className="grid gap-4 text-sm">
        {metaLabels.map(([label]) => (
          <div key={label} className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              {label}
            </p>
            <SkeletonLine className="h-4 w-44 rounded-xl" />
          </div>
        ))}
      </div>

      <div className="space-y-6">
        <div className="rounded-[26px] border border-border-subtle bg-white/80 px-5 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
            Reaction
          </p>
          <div className="mt-4 space-y-3">
            <SkeletonLine className="h-6 w-full" />
            <SkeletonLine className="h-6 w-[82%]" />
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
            What lands
          </p>
          <div className="space-y-3">
            <SkeletonLine className="h-4 w-full" />
            <SkeletonLine className="h-4 w-[88%]" />
            <SkeletonLine className="h-4 w-[78%]" />
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
            What concerns me
          </p>
          <div className="space-y-3">
            <SkeletonLine className="h-4 w-full" />
            <SkeletonLine className="h-4 w-[85%]" />
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
            Questions for PM
          </p>
          <div className="space-y-3">
            <SkeletonLine className="h-4 w-full" />
            <SkeletonLine className="h-4 w-[84%]" />
            <SkeletonLine className="h-4 w-[70%]" />
          </div>
        </div>
      </div>
    </div>
  );
}

function FailedBody({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="space-y-5">
      <div className="rounded-[26px] border border-verdict-reject-bg bg-verdict-reject-bg/50 px-5 py-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-verdict-reject-text">
          Evaluation failed
        </p>
        <p className="mt-2 text-sm leading-7 text-foreground">{message}</p>
        {onRetry ? (
          <div className="mt-4">
            <Button variant="outline" onClick={onRetry}>
              Retry evaluation
            </Button>
          </div>
        ) : null}
      </div>

      <PendingBody />
    </div>
  );
}

export function PersonaResultCard({
  personaEvaluation,
  defaultOpen = false,
  onRetry,
}: PersonaResultCardProps) {
  const { persona, status, evaluation, errorMessage } = personaEvaluation;
  const isPending = status === "pending";
  const isFailed = status === "failed";
  const isOpen = defaultOpen || isFailed;
  const openQuote = evaluation?.reaction.trim().replace(/^["“]+|["”]+$/g, "");
  const completedEvaluation = evaluation as NonNullable<typeof evaluation>;

  return (
    <details
      className="group w-full overflow-hidden rounded-[28px] border border-border-subtle bg-white shadow-[0_12px_30px_-24px_rgba(38,27,78,0.25)]"
      open={isOpen}
    >
      <summary className="list-none cursor-pointer px-4 py-4 outline-none transition-colors hover:bg-white/35 focus-visible:bg-white/35 md:px-5 md:py-5">
        <div className="grid gap-3 xl:grid-cols-[minmax(0,235px)_minmax(0,1fr)_auto_170px] xl:items-center">
          <div className="flex min-w-0 items-center gap-3">
            <PersonaAvatar name={persona.name} size="lg" />
            <div className="min-w-0">
              <p className="truncate font-display text-[23px] font-bold leading-tight text-foreground">
                {persona.name}
              </p>
              <p className="truncate text-[10px] font-medium uppercase tracking-[0.3em] text-muted-foreground">
                {persona.role}
              </p>
            </div>
          </div>

          <div className="min-w-0 text-[14px] leading-7 text-foreground/90 md:text-[15px] xl:pl-2">
            {isPending ? (
              <SkeletonLine className="h-5 w-full max-w-[520px]" />
            ) : isFailed ? (
              <p className="truncate text-foreground/85">
                {errorMessage ?? "Could not finish this persona."}
              </p>
            ) : (
              <p className="truncate">
                <span className="text-muted-foreground">“</span>
                {openQuote}
                <span className="text-muted-foreground">”</span>
              </p>
            )}
          </div>

          <div className="flex items-center xl:justify-self-end">
            {isPending ? (
              <span className="h-8 w-20 animate-pulse rounded-full bg-surface-panel-strong/80" />
            ) : isFailed ? (
              <span className="inline-flex items-center rounded-full bg-verdict-reject-bg px-3 py-1 text-xs font-semibold tracking-wide text-verdict-reject-text">
                Needs retry
              </span>
            ) : (
              <Badge verdict={completedEvaluation.verdict} variant="persona" />
            )}
          </div>

          <div className="space-y-2 xl:justify-self-end">
            <div className="flex items-center justify-between gap-3 xl:w-[150px]">
              <span className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                Score
              </span>
              {isPending ? (
                <SkeletonLine className="h-5 w-12" />
              ) : (
                <span className="font-display text-lg font-bold text-foreground">
                  {isFailed ? "—" : `${completedEvaluation.score}/100`}
                </span>
              )}
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-black/5">
              {isPending ? (
                <div className="h-full w-1/2 animate-pulse rounded-full bg-surface-panel-strong/80" />
              ) : isFailed ? (
                <div className="h-full w-[10%] rounded-full bg-rose-400" />
              ) : (
                <div
                  className={cn("h-full rounded-full", getScoreBarClass(completedEvaluation.verdict))}
                  style={{ width: `${completedEvaluation.score}%` }}
                />
              )}
            </div>
          </div>
        </div>

        <div className="mt-8 flex items-center justify-between border-t border-border-subtle pt-5">
          <span className="sr-only">
            {isPending ? "Loading" : isFailed ? "Needs retry" : "Click for details"}
          </span>
          <span className="text-sm text-muted-foreground transition-transform duration-200 group-open:rotate-180">
            ▾
          </span>
        </div>
      </summary>

      <div className="border-t border-border-subtle px-5 py-6 md:px-6 md:py-7">
        {isPending ? (
          <div className="space-y-6">
            <PendingBody />
            <div className="rounded-[26px] border border-border-subtle bg-surface-panel/70 px-5 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                Suggestion
              </p>
              <div className="mt-3 space-y-3">
                <SkeletonLine className="h-4 w-full" />
                <SkeletonLine className="h-4 w-[82%]" />
              </div>
            </div>
          </div>
        ) : isFailed ? (
          <FailedBody message={errorMessage ?? "This persona could not be evaluated."} onRetry={onRetry} />
        ) : (
          <div className="grid gap-6 xl:grid-cols-[220px_minmax(0,1fr)_320px]">
            <dl className="grid gap-4 text-sm">
              {metaLabels.map(([label, key]) => (
                <div key={label} className="space-y-1">
                  <dt className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                    {label}
                  </dt>
                  <dd className="leading-6 text-foreground">
                    {completedEvaluation.metadata[key] || "—"}
                  </dd>
                </div>
              ))}
            </dl>

            <div className="space-y-6">
              <div className="rounded-[26px] border border-border-subtle bg-white/80 px-5 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                  Reaction
                </p>
                <p className="mt-3 text-[18px] leading-8 text-foreground md:text-[20px]">
                  {completedEvaluation.reaction}
                </p>
              </div>

              <section className="space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                  What lands
                </p>
                <ul className="space-y-3">
                  {completedEvaluation.what_lands.map((item, index) => (
                    <li
                      key={`${item}-${index}`}
                      className="flex gap-3 text-sm leading-6 text-foreground"
                    >
                      <span
                        className={cn(
                          "mt-2 h-2 w-2 shrink-0 rounded-full",
                          renderListItemTone(index, completedEvaluation.verdict),
                        )}
                      />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </section>
            </div>

            <div className="space-y-6">
              <section className="space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                  What concerns me
                </p>
                <ul className="space-y-3">
                  {completedEvaluation.what_concerns_me.map((item, index) => (
                    <li
                      key={`${item}-${index}`}
                      className="flex gap-3 text-sm leading-6 text-foreground"
                    >
                      <span
                        className={cn(
                          "mt-2 h-2 w-2 shrink-0 rounded-full",
                          completedEvaluation.verdict === "reject"
                            ? "bg-rose-500"
                            : completedEvaluation.verdict === "mixed"
                              ? "bg-amber-500"
                              : index === 0
                                ? "bg-amber-500"
                                : "bg-rose-400",
                        )}
                      />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                  Questions for PM
                </p>
                <ul className="space-y-3">
                  {completedEvaluation.questions_for_pm.map((item) => (
                    <li
                      key={item}
                      className="flex gap-3 text-sm leading-6 text-foreground"
                    >
                      <span className="mt-0.5 text-sm font-semibold text-primary">?</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          </div>
        )}

        {isPending || isFailed ? null : (
          <div className="mt-6 rounded-[26px] border border-border-subtle bg-surface-panel/70 px-5 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              Suggestion
            </p>
            <p className="mt-2 text-sm leading-7 text-foreground">
              {completedEvaluation.suggestion}
            </p>
          </div>
        )}
      </div>
    </details>
  );
}
