"use client";

import { useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";

import { PersonaSelectorItem } from "@/components/evaluations/persona-selector-item";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TextArea } from "@/components/ui/textarea";
import { isValidationApiError } from "@/lib/api-validation";
import {
  EVALUATION_IMAGE_ACCEPT,
  EVALUATION_PERSONA_COUNT,
  formatBytes,
  getEvaluationImageValidationError,
  MAX_EVALUATION_IMAGE_BYTES,
  MAX_EVALUATION_IMAGES,
} from "@/lib/evaluation-constraints";
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
    initialDraft.selectedPersonaIds.slice(0, EVALUATION_PERSONA_COUNT),
  );
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [formState, setFormState] = useState<
    "idle" | "submitting" | "pending" | "failed"
  >("idle");
  const [runError, setRunError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    idea: string | null;
    images: string | null;
    personas: string | null;
  }>({
    idea: null,
    images: null,
    personas: null,
  });

  function togglePersona(id: string) {
    if (
      !selectedPersonaIds.includes(id) &&
      selectedPersonaIds.length >= EVALUATION_PERSONA_COUNT
    ) {
      setFieldErrors((currentValue) => ({
        ...currentValue,
        personas: `Select exactly ${EVALUATION_PERSONA_COUNT} personas. Remove one before adding another.`,
      }));
      return;
    }

    setSelectedPersonaIds((currentValue) =>
      currentValue.includes(id)
        ? currentValue.filter((personaId) => personaId !== id)
        : [...currentValue, id],
    );
    setFieldErrors((currentValue) => ({
      ...currentValue,
      personas: null,
    }));
  }

  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const files = [...imageFiles, ...Array.from(event.target.files ?? [])];
    const error = getEvaluationImageValidationError(files);

    if (error) {
      setFieldErrors((currentValue) => ({
        ...currentValue,
        images: error,
      }));
      event.target.value = "";
      return;
    }

    setImageFiles(files);
    setFieldErrors((currentValue) => ({
      ...currentValue,
      images: null,
    }));
    event.target.value = "";
  }

  function removeImage(index: number) {
    setImageFiles((currentValue) =>
      currentValue.filter((_, currentIndex) => currentIndex !== index),
    );
    setFieldErrors((currentValue) => ({
      ...currentValue,
      images: null,
    }));
  }

  async function runPanel() {
    const featureDescription = idea.trim();
    const imageError = getEvaluationImageValidationError(imageFiles);

    if (!featureDescription) {
      setFieldErrors((currentValue) => ({
        ...currentValue,
        idea: "Please describe the idea you want to evaluate.",
      }));
      return;
    }

    if (selectedPersonaIds.length !== EVALUATION_PERSONA_COUNT) {
      setFieldErrors((currentValue) => ({
        ...currentValue,
        personas: `Select exactly ${EVALUATION_PERSONA_COUNT} personas to run the panel.`,
      }));
      return;
    }

    if (imageError) {
      setFieldErrors((currentValue) => ({
        ...currentValue,
        images: imageError,
      }));
      return;
    }

    setFormState("submitting");
    setRunError(null);
    setFieldErrors({
      idea: null,
      images: null,
      personas: null,
    });

    try {
      const formData = new FormData();
      formData.append("feature_description", featureDescription);
      formData.append("persona_ids", JSON.stringify(selectedPersonaIds));
      imageFiles.forEach((file) => {
        formData.append("images", file, file.name);
      });

      const response = await fetch("/api/evaluations/start", {
        method: "POST",
        body: formData,
      });

      const data: { evaluation_id?: string; error?: string } = await response.json();

      if (!response.ok || !data.evaluation_id) {
        if (response.status === 400 && isValidationApiError(data)) {
          setFormState("idle");
          if (data.field.toLowerCase().includes("idea")) {
            setFieldErrors((currentValue) => ({
              ...currentValue,
              idea: data.error,
            }));
          } else if (data.field.toLowerCase().includes("image")) {
            setFieldErrors((currentValue) => ({
              ...currentValue,
              images: data.error,
            }));
          } else {
            setFieldErrors((currentValue) => ({
              ...currentValue,
              personas: data.error,
            }));
          }
          return;
        }

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
          onChange={(event) => {
            setIdea(event.target.value);
            setFieldErrors((currentValue) => ({
              ...currentValue,
              idea: null,
            }));
          }}
          className="min-h-72"
          placeholder="Describe your idea..."
        />
        <p
          className="min-h-5 text-sm font-medium text-verdict-reject-text"
          aria-live="polite"
        >
          {fieldErrors.idea ?? ""}
        </p>
        <div className="space-y-3 rounded-2xl border border-dashed border-border-strong bg-white/70 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">Attach images</p>
              <p className="text-sm leading-6 text-muted-foreground">
                Up to {MAX_EVALUATION_IMAGES} PNG, JPG, or WebP images. Recommended max{" "}
                {formatBytes(MAX_EVALUATION_IMAGE_BYTES)} each.
              </p>
            </div>
            <label
              htmlFor="evaluation-images"
              className="inline-flex cursor-pointer items-center justify-center rounded-2xl border border-border-subtle bg-white px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-surface-panel"
            >
              Choose images
            </label>
            <input
              id="evaluation-images"
              type="file"
              accept={EVALUATION_IMAGE_ACCEPT}
              multiple
              className="sr-only"
              onChange={handleImageChange}
            />
          </div>

          {imageFiles.length ? (
            <ul className="space-y-2">
              {imageFiles.map((file, index) => (
                <li
                  key={`${file.name}-${file.lastModified}-${index}`}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-border-subtle bg-surface-panel px-3 py-2 text-sm"
                >
                  <span className="min-w-0 flex-1 truncate text-foreground">
                    {file.name}
                  </span>
                  <span className="shrink-0 text-muted-foreground">
                    {formatBytes(file.size)}
                  </span>
                  <button
                    type="button"
                    className="shrink-0 text-sm font-semibold text-primary"
                    onClick={() => removeImage(index)}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No images attached.</p>
          )}
        </div>
        <p
          className="min-h-5 text-sm font-medium text-verdict-reject-text"
          aria-live="polite"
        >
          {fieldErrors.images ?? ""}
        </p>
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
                Select {EVALUATION_PERSONA_COUNT} Personas
              </h2>
              <p className="text-sm text-muted-foreground">
                Choose exactly three viewpoints for this evaluation.
              </p>
            </div>
            <button
              type="button"
              className="text-sm font-medium text-primary"
              onClick={() => {
                setSelectedPersonaIds(
                  personas
                    .slice(0, EVALUATION_PERSONA_COUNT)
                    .map((persona) => persona.id),
                );
                setFieldErrors((currentValue) => ({
                  ...currentValue,
                  personas: null,
                }));
              }}
            >
              Select {EVALUATION_PERSONA_COUNT}
            </button>
          </div>

          <div className="space-y-3">
            {personas.map((persona) => (
              <PersonaSelectorItem
                key={persona.id}
                persona={persona}
                checked={selectedPersonaIds.includes(persona.id)}
                disabled={
                  !selectedPersonaIds.includes(persona.id) &&
                  selectedPersonaIds.length >= EVALUATION_PERSONA_COUNT
                }
                onToggle={togglePersona}
              />
            ))}
          </div>
          <p
            className="min-h-5 text-sm font-medium text-verdict-reject-text"
            aria-live="polite"
          >
            {fieldErrors.personas ?? ""}
          </p>
        </Card>

        <Card className="space-y-5">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">Ready to run</p>
            <p className="text-sm text-muted-foreground">
              {selectedPersonaIds.length} of {EVALUATION_PERSONA_COUNT} personas selected
            </p>
            <p className="text-sm text-muted-foreground">
              {imageFiles.length
                ? `${imageFiles.length} image${imageFiles.length === 1 ? "" : "s"} attached`
                : "No images attached"}
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
