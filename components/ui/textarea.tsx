import type { ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/utils";

export function TextArea({
  className,
  ...props
}: ComponentPropsWithoutRef<"textarea">) {
  return (
    <textarea
      className={cn(
        "w-full rounded-3xl border border-border-subtle bg-surface-panel px-5 py-4 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/35 focus:bg-white",
        className,
      )}
      {...props}
    />
  );
}
