import { redirect } from "next/navigation";

import { Card } from "@/components/ui/card";
import { getCurrentAuthContext } from "@/lib/auth";

export default async function PendingApprovalPage() {
  const context = await getCurrentAuthContext().catch(() => null);

  if (!context) {
    redirect("/login");
  }

  if (context.profile.approvalStatus === "approved") {
    redirect("/dashboard");
  }

  if (context.profile.approvalStatus === "rejected") {
    redirect("/login?error=access-rejected");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5 py-12">
      <Card className="w-full max-w-lg space-y-6 p-8">
        <div className="space-y-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,var(--color-primary),var(--color-primary-strong))] text-lg font-bold text-white">
            PP
          </div>
          <h1 className="font-display text-3xl font-bold text-foreground">
            Approval pending
          </h1>
          <p className="text-sm leading-6 text-muted-foreground">
            Your account is waiting for admin approval. You will be able to use Persona Panel after an admin approves access.
          </p>
        </div>

        <div className="rounded-2xl border border-border-subtle bg-surface-panel px-4 py-3 text-sm text-foreground">
          Signed in as {context.profile.email}
        </div>

        <form action="/auth/signout" method="post">
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-2xl border border-border-subtle bg-white px-5 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-surface-panel"
          >
            Sign out
          </button>
        </form>
      </Card>
    </main>
  );
}
