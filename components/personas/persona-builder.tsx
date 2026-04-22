"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { TextArea } from "@/components/ui/textarea";
import type {
  Persona,
  PersonaDraft,
  PersonaEvaluationLensItem,
  PersonaGenerated,
} from "@/lib/types";

type PersonaBuilderProps = {
  initialDraft: PersonaDraft;
  initialPersona?: Persona | null;
};

type GeneratedPersonaState = PersonaDraft["generatedPersona"];

type CreatePersonaResponse = {
  persona: PersonaGenerated;
};

function cloneGeneratedPersona(draft: PersonaDraft): GeneratedPersonaState {
  return {
    ...draft.generatedPersona,
    goals: [...draft.generatedPersona.goals],
    frustrations: [...draft.generatedPersona.frustrations],
    evaluation_lens: draft.generatedPersona.evaluation_lens.map((item) => ({
      ...item,
    })),
  };
}

function buildGeneratedPersonaFromPersona(
  persona: Persona,
): GeneratedPersonaState {
  return {
    name: persona.name,
    role: persona.role,
    company_size: persona.companySize ?? null,
    company_type: persona.companyType ?? null,
    seniority: persona.seniority ?? null,
    summary: persona.summary,
    voice: persona.voice || null,
    goals: [...persona.goals],
    frustrations: [...persona.frustrations],
    evaluation_lens: persona.evaluationLens.map((item) => ({ ...item })),
    quote: persona.quote ?? null,
  };
}

type ListEditorProps = {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
};

type LensEditorProps = {
  values: PersonaEvaluationLensItem[];
  onChange: (values: PersonaEvaluationLensItem[]) => void;
};

function ListEditor({ label, values, onChange }: ListEditorProps) {
  function updateValue(index: number, nextValue: string) {
    onChange(values.map((value, currentIndex) => (currentIndex === index ? nextValue : value)));
  }

  function addValue() {
    onChange([...values, ""]);
  }

  function removeValue(index: number) {
    onChange(values.filter((_, currentIndex) => currentIndex !== index));
  }

  return (
    <div className="space-y-3">
      <label className="text-sm font-semibold text-foreground">{label}</label>
      <div className="space-y-3">
        {values.map((value, index) => (
          <div key={`${label}-${index}`} className="flex gap-3">
            <Input
              value={value}
              onChange={(event) => updateValue(index, event.target.value)}
            />
            <Button
              variant="outline"
              className="shrink-0 px-4"
              onClick={() => removeValue(index)}
            >
              Remove
            </Button>
          </div>
        ))}
      </div>
      <Button variant="secondary" onClick={addValue}>
        Add Item
      </Button>
    </div>
  );
}

function LensEditor({ values, onChange }: LensEditorProps) {
  function updateValue(
    index: number,
    key: keyof PersonaEvaluationLensItem,
    nextValue: string,
  ) {
    onChange(
      values.map((value, currentIndex) =>
        currentIndex === index ? { ...value, [key]: nextValue } : value,
      ),
    );
  }

  function addValue() {
    onChange([
      ...values,
      { criterion: "", why_it_matters: "", tradeoff: "" },
    ]);
  }

  function removeValue(index: number) {
    onChange(values.filter((_, currentIndex) => currentIndex !== index));
  }

  return (
    <div className="space-y-3">
      <label className="text-sm font-semibold text-foreground">
        Evaluation Lens
      </label>
      <div className="space-y-4">
        {values.map((value, index) => (
          <Card key={`${value.criterion || "lens"}-${index}`} tone="muted" className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">
                  Lens {index + 1}
                </p>
                <p className="text-xs text-muted-foreground">
                  Keep the criterion short and specific.
                </p>
              </div>
              <Button
                variant="outline"
                className="shrink-0 px-4"
                onClick={() => removeValue(index)}
              >
                Remove
              </Button>
            </div>

            <div className="grid gap-3">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Criterion
                </label>
                <Input
                  value={value.criterion}
                  onChange={(event) =>
                    updateValue(index, "criterion", event.target.value)
                  }
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Why It Matters
                </label>
                <TextArea
                  rows={2}
                  value={value.why_it_matters}
                  onChange={(event) =>
                    updateValue(index, "why_it_matters", event.target.value)
                  }
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Tradeoff
                </label>
                <TextArea
                  rows={2}
                  value={value.tradeoff}
                  onChange={(event) =>
                    updateValue(index, "tradeoff", event.target.value)
                  }
                />
              </div>
            </div>
          </Card>
        ))}
      </div>
      <Button variant="secondary" onClick={addValue}>
        Add Item
      </Button>
    </div>
  );
}

export function PersonaBuilder({
  initialDraft,
  initialPersona,
}: PersonaBuilderProps) {
  const router = useRouter();
  const [description, setDescription] = useState(
    initialPersona?.generationPrompt ??
      initialPersona?.summary ??
      initialDraft.description,
  );
  const [persona, setPersona] = useState<GeneratedPersonaState>(
    initialPersona
      ? buildGeneratedPersonaFromPersona(initialPersona)
      : cloneGeneratedPersona(initialDraft),
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDescriptionFocused, setIsDescriptionFocused] = useState(false);
  const [hasClearedDescription, setHasClearedDescription] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const isEditing = Boolean(initialPersona);

  async function generatePersona() {
    const prompt = description.trim();

    if (!prompt) {
      setGenerationError("Please describe the persona you want to create.");
      return;
    }

    setIsGenerating(true);
    setGenerationError(null);
    setSaveError(null);

    try {
      const response = await fetch("/api/personas/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt }),
      });

      const data: Partial<CreatePersonaResponse> & { error?: string } =
        await response.json();

      if (!response.ok || !data.persona) {
        throw new Error(data.error ?? "Failed to generate persona.");
      }

      setPersona(data.persona);
    } catch (error) {
      setGenerationError(
        error instanceof Error ? error.message : "Failed to generate persona.",
      );
    } finally {
      setIsGenerating(false);
    }
  }

  function regeneratePersona() {
    setSaveError(null);
    void generatePersona();
  }

  async function savePersona() {
    if (!persona.name.trim() || !persona.role.trim() || !persona.summary.trim()) {
      setSaveError("Name, role, and summary are required.");
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
        const payload = {
          id: initialPersona?.id,
          name: persona.name.trim(),
          role: persona.role.trim(),
          summary: persona.summary.trim(),
          voice: persona.voice?.trim() || null,
        goals: persona.goals.map((goal) => goal.trim()).filter(Boolean),
        frustrations: persona.frustrations
          .map((frustration) => frustration.trim())
          .filter(Boolean),
        evaluation_lens: persona.evaluation_lens
          .map((lens) => ({
            criterion: lens.criterion.trim(),
            why_it_matters: lens.why_it_matters.trim(),
            tradeoff: lens.tradeoff.trim(),
          }))
          .filter(
            (lens) => lens.criterion || lens.why_it_matters || lens.tradeoff,
          ),
        company_size: persona.company_size?.trim() || null,
        company_type: persona.company_type?.trim() || null,
        seniority: persona.seniority?.trim() || null,
        quote: persona.quote?.trim() || null,
        generation_prompt:
          description.trim() ||
          initialPersona?.generationPrompt ||
          initialPersona?.summary ||
          null,
        source_type: initialPersona?.sourceType ?? ("generated" as const),
      };

      const response = await fetch("/api/personas/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data: { error?: string } = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to save persona.");
      }

      router.push("/dashboard");
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : "Failed to save persona.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
      <Card className="space-y-5">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-foreground">
            Describe the persona
          </label>
          <p className="text-sm text-muted-foreground">
            Include role, context, goals, frustrations, and decision style.
          </p>
        </div>
        <TextArea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          onFocus={() => {
            setIsDescriptionFocused(true);

            if (!isEditing && !hasClearedDescription) {
              setDescription("");
              setHasClearedDescription(true);
            }
          }}
          onBlur={() => setIsDescriptionFocused(false)}
          rows={10}
          className="min-h-60"
          placeholder={
            isDescriptionFocused || (!isEditing && !description.trim())
              ? "Describe the persona..."
              : ""
          }
        />
        {generationError ? (
          <p className="text-sm font-medium text-verdict-reject-text">
            {generationError}
          </p>
        ) : null}
        <Button onClick={generatePersona} disabled={isGenerating}>
          {isGenerating ? "Generating..." : "Generate Persona"}
        </Button>
      </Card>

      <Card className="space-y-5">
        <div className="space-y-1">
          <h2 className="font-display text-2xl font-bold text-foreground">
            {isEditing ? "Edit Persona" : "Persona Draft"}
          </h2>
          <p className="text-sm text-muted-foreground">
            Keep the output simple and editable before saving.
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">Name</label>
            <Input
              value={persona.name}
              onChange={(event) =>
                setPersona((currentPersona) => ({
                  ...currentPersona,
                  name: event.target.value,
                }))
              }
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">Role</label>
            <Input
              value={persona.role}
              onChange={(event) =>
                setPersona((currentPersona) => ({
                  ...currentPersona,
                  role: event.target.value,
                }))
              }
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">Summary</label>
            <TextArea
              rows={4}
              value={persona.summary}
              onChange={(event) =>
                setPersona((currentPersona) => ({
                  ...currentPersona,
                  summary: event.target.value,
                }))
              }
            />
          </div>

          <ListEditor
            label="Goals"
            values={persona.goals}
            onChange={(goals) =>
              setPersona((currentPersona) => ({ ...currentPersona, goals }))
            }
          />
          <ListEditor
            label="Frustrations"
            values={persona.frustrations}
            onChange={(frustrations) =>
              setPersona((currentPersona) => ({ ...currentPersona, frustrations }))
            }
          />
          <LensEditor
            values={persona.evaluation_lens}
            onChange={(evaluation_lens) =>
              setPersona((currentPersona) => ({
                ...currentPersona,
                evaluation_lens,
              }))
            }
          />

          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">Voice</label>
            <Input
              value={persona.voice ?? ""}
              onChange={(event) =>
                setPersona((currentPersona) => ({
                  ...currentPersona,
                  voice: event.target.value,
                }))
              }
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">Quote</label>
            <TextArea
              rows={3}
              value={persona.quote ?? ""}
              onChange={(event) =>
                setPersona((currentPersona) => ({
                  ...currentPersona,
                  quote: event.target.value,
                }))
              }
            />
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button className="sm:flex-1" onClick={savePersona} disabled={isSaving}>
            {isSaving ? "Saving..." : isEditing ? "Save Changes" : "Save Persona"}
          </Button>
          <Button
            variant="secondary"
            className="sm:flex-1"
            onClick={regeneratePersona}
            disabled={isGenerating}
          >
            Regenerate
          </Button>
        </div>

        {saveError ? (
          <p className="text-sm font-medium text-verdict-reject-text">{saveError}</p>
        ) : null}
      </Card>
    </div>
  );
}
