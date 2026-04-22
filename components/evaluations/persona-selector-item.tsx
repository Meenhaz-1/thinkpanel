"use client";

import { PersonaAvatar } from "@/components/personas/persona-avatar";
import type { Persona } from "@/lib/types";
import { cn } from "@/lib/utils";

type PersonaSelectorItemProps = {
  persona: Persona;
  checked: boolean;
  onToggle: (id: string) => void;
};

export function PersonaSelectorItem({
  persona,
  checked,
  onToggle,
}: PersonaSelectorItemProps) {
  return (
    <label className="block cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={() => onToggle(persona.id)}
        className="sr-only"
      />
      <div
        className={cn(
          "rounded-3xl border px-4 py-4 transition-colors",
          checked
            ? "border-primary/40 bg-primary/5"
            : "border-border-subtle bg-white hover:bg-surface-panel",
        )}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <PersonaAvatar name={persona.name} size="sm" />
            <div className="min-w-0 space-y-1">
              <p className="truncate font-display text-lg font-bold text-foreground">
                {persona.name}
              </p>
              <p className="truncate text-sm text-muted-foreground">{persona.role}</p>
            </div>
          </div>
          <div
            className={cn(
              "mt-1 h-5 w-5 rounded-full border transition-colors",
              checked ? "border-primary bg-primary" : "border-border-strong bg-white",
            )}
          />
        </div>
      </div>
    </label>
  );
}
