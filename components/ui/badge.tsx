import type { EvaluationDecision, PersonaVerdict } from "@/lib/types";
import { cn } from "@/lib/utils";

type BadgeVariant = "decision" | "persona";

type BadgeValue = EvaluationDecision | PersonaVerdict;

const verdictClasses: Record<BadgeVariant, Record<BadgeValue, string>> = {
  decision: {
    ship: "bg-verdict-ship-bg text-verdict-ship-text",
    risky: "bg-verdict-risky-bg text-verdict-risky-text",
    reject: "bg-verdict-reject-bg text-verdict-reject-text",
    love: "bg-verdict-ship-bg text-verdict-ship-text",
    like: "bg-verdict-ship-bg text-verdict-ship-text",
    mixed: "bg-verdict-risky-bg text-verdict-risky-text",
  },
  persona: {
    ship: "bg-verdict-ship-bg text-verdict-ship-text",
    risky: "bg-verdict-risky-bg text-verdict-risky-text",
    reject: "bg-verdict-reject-bg text-verdict-reject-text",
    love: "bg-emerald-100 text-emerald-800",
    like: "bg-emerald-100 text-emerald-800",
    mixed: "bg-verdict-risky-bg text-verdict-risky-text",
  },
};

const verdictLabels: Record<BadgeVariant, Record<BadgeValue, string>> = {
  decision: {
    ship: "Ship",
    risky: "Risky",
    reject: "Do Not Proceed",
    love: "Love",
    like: "Like",
    mixed: "Mixed",
  },
  persona: {
    ship: "Ship",
    risky: "Risky",
    reject: "Reject",
    love: "Loves it",
    like: "Likes it",
    mixed: "Mixed",
  },
};

type BadgeProps = {
  verdict: BadgeValue;
  variant?: BadgeVariant;
  className?: string;
};

const defaultVariant: BadgeVariant = "decision";

export function Badge({ verdict, variant = defaultVariant, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold tracking-wide",
        verdictClasses[variant][verdict],
        className,
      )}
    >
      {verdictLabels[variant][verdict]}
    </span>
  );
}
