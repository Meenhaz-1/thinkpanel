import type { PersonaEvaluationLensItem } from "@/lib/types";

function toLensItem(item: unknown): PersonaEvaluationLensItem | null {
  if (!item || typeof item !== "object") {
    return null;
  }

  const candidate = item as Record<string, unknown>;
  const criterion = typeof candidate.criterion === "string" ? candidate.criterion.trim() : "";
  const whyItMatters =
    typeof candidate.why_it_matters === "string" ? candidate.why_it_matters.trim() : "";
  const tradeoff =
    typeof candidate.tradeoff === "string" ? candidate.tradeoff.trim() : "";

  if (!criterion && !whyItMatters && !tradeoff) {
    return null;
  }

  return {
    criterion: criterion || "Decision lens",
    why_it_matters: whyItMatters,
    tradeoff,
  };
}

export function isPersonaEvaluationLensItem(
  value: unknown,
): value is PersonaEvaluationLensItem {
  return Boolean(
    value &&
      typeof value === "object" &&
      typeof (value as Record<string, unknown>).criterion === "string" &&
      typeof (value as Record<string, unknown>).why_it_matters === "string" &&
      typeof (value as Record<string, unknown>).tradeoff === "string",
  );
}

export function normalizeEvaluationLens(
  lens: unknown,
): PersonaEvaluationLensItem[] {
  if (!Array.isArray(lens)) {
    return [];
  }

  if (lens.every((item) => typeof item === "string")) {
    return lens
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => ({
        criterion: item,
        why_it_matters: "",
        tradeoff: "",
      }));
  }

  return lens.map(toLensItem).filter((item): item is PersonaEvaluationLensItem => item !== null);
}

export function formatEvaluationLens(
  lens: unknown,
  fallback = "decision quality",
): string {
  const normalized = normalizeEvaluationLens(lens);

  if (!normalized.length) {
    return fallback;
  }

  return normalized
    .map((item) => item.criterion.trim())
    .filter(Boolean)
    .join(" • ");
}
