"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { PersonaSelectorItem } from "@/components/evaluations/persona-selector-item";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TextArea } from "@/components/ui/textarea";
import type { EvaluationDraft, Persona } from "@/lib/types";

type NewEvaluationFormProps = {
  personas: Persona[];
  initialDraft: EvaluationDraft;
};

export function NewEvaluationForm({
  personas,
  initialDraft,
}: NewEvaluationFormProps) {
  const router = useRouter();
  const [idea, setIdea] = useState(initialDraft.idea);
  const [selectedPersonaIds, setSelectedPersonaIds] = useState<string[]>(
    initialDraft.selectedPersonaIds,
  );
  const [formState, setFormState] = useState<
    "idle" | "submitting" | "pending" | "failed"
  >("idle");
  const [runError, setRunError] = useState<string | null>(null);

  function togglePersona(id: string) {
    setSelectedPersonaIds((currentValue) =>
      currentValue.includes(id)
        ? currentValue.filter((personaId) => personaId !== id)
        : [...currentValue, id],
    );
  }

  async function runPanel() {
    const featureDescription = idea.trim();

    if (!featureDescription) {
      setRunError("Please describe the idea you want to evaluate.");
      return;
    }

    if (!selectedPersonaIds.length) {
      setRunError("Select at least one persona to run the panel.");
      return;
    }

    setFormState("submitting");
    setRunError(null);

    try {
      const response = await fetch("/api/evaluations/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          feature_description: featureDescription,
          persona_ids: selectedPersonaIds,
        }),
      });

      const data: { evaluation_id?: string; error?: string } = await response.json();

      if (!response.ok || !data.evaluation_id) {
        throw new Error(data.error ?? "Failed to create evaluation run.");
      }

      setFormState("pending");
      router.push(`/evaluations/${data.evaluation_id}`);
    } catch (error) {
      setFormState("failed");
      setRunError(
        error instanceof Error ? error.message : "Failed to create evaluation run.",
      );
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
      <Card className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-foreground">
            Describe your idea
          </label>
          <p className="text-sm text-muted-foreground">
            Give the panel enough context to judge the idea clearly.
          </p>
        </div>
        <TextArea
          rows={14}
          value={idea}
          onChange={(event) => setIdea(event.target.value)}
          className="min-h-72"
          placeholder="Describe your idea..."
        />
        {runError ? (
          <p className="text-sm font-medium text-verdict-reject-text">
            {runError}
          </p>
        ) : null}
      </Card>

      <div className="space-y-6">
        <Card className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-2xl font-bold text-foreground">
                Select Personas
              </h2>
              <p className="text-sm text-muted-foreground">
                Choose the panel for this evaluation.
              </p>
            </div>
            <button
              type="button"
              className="text-sm font-medium text-primary"
              onClick={() => setSelectedPersonaIds(personas.map((persona) => persona.id))}
            >
              Select all
            </button>
          </div>

          <div className="space-y-3">
            {personas.map((persona) => (
              <PersonaSelectorItem
                key={persona.id}
                persona={persona}
                checked={selectedPersonaIds.includes(persona.id)}
                onToggle={togglePersona}
              />
            ))}
          </div>
        </Card>

        <Card className="space-y-5">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">Ready to run</p>
            <p className="text-sm text-muted-foreground">
              {selectedPersonaIds.length} persona
              {selectedPersonaIds.length === 1 ? "" : "s"} selected
            </p>
          </div>
          <Button className="w-full" onClick={runPanel} disabled={formState === "submitting"}>
            {formState === "submitting" ? "Creating..." : "Run Panel"}
          </Button>
        </Card>
      </div>
    </div>
  );
}
