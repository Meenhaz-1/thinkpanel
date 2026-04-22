import type { ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/utils";

type CardProps = ComponentPropsWithoutRef<"div"> & {
  tone?: "default" | "muted" | "strong";
};

const toneClasses = {
  default: "bg-white",
  muted: "bg-surface-panel",
  strong: "bg-surface-panel-strong",
};

export function Card({
  className,
  tone = "default",
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        "rounded-3xl border border-border-subtle p-6 shadow-[0_12px_30px_-24px_rgba(38,27,78,0.25)]",
        toneClasses[tone],
        className,
      )}
      {...props}
    />
  );
}
