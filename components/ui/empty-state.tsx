import type { ReactNode } from "react";

import { Card } from "@/components/ui/card";

type EmptyStateProps = {
  title: string;
  description: string;
  action?: ReactNode;
};

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <Card tone="muted" className="flex min-h-52 flex-col items-center justify-center text-center">
      <div className="space-y-3">
        <h3 className="font-display text-xl font-bold text-foreground">{title}</h3>
        <p className="max-w-sm text-sm leading-6 text-muted-foreground">{description}</p>
        {action ? <div className="pt-2">{action}</div> : null}
      </div>
    </Card>
  );
}
