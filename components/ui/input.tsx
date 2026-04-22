import type { ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/utils";

export function Input({
  className,
  ...props
}: ComponentPropsWithoutRef<"input">) {
  return (
    <input
      className={cn(
        "w-full rounded-2xl border border-border-subtle bg-surface-panel px-4 py-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/35 focus:bg-white",
        className,
      )}
      {...props}
    />
  );
}
