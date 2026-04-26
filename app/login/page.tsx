import { redirect } from "next/navigation";

import { GoogleLoginButton } from "@/components/auth/google-login-button";
import { Card } from "@/components/ui/card";
import { getCurrentAuthContext } from "@/lib/auth";

type LoginPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

function authErrorMessage(error?: string) {
  if (error === "access-rejected") {
    return "Your account was not approved for this workspace.";
  }

  if (error === "auth-code") {
    return "Google sign in could not be completed. Please try again.";
  }

  return null;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const context = await getCurrentAuthContext().catch(() => null);
  const { error } = await searchParams;

  if (context?.profile.approvalStatus === "approved") {
    redirect("/dashboard");
  }

  if (context?.profile.approvalStatus === "pending") {
    redirect("/pending-approval");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5 py-12">
      <Card className="w-full max-w-md space-y-6 p-8">
        <div className="space-y-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,var(--color-primary),var(--color-primary-strong))] text-lg font-bold text-white">
            PP
          </div>
          <h1 className="font-display text-3xl font-bold text-foreground">
            Sign in to Persona Panel
          </h1>
          <p className="text-sm leading-6 text-muted-foreground">
            Use your Google account. New accounts need admin approval before they can use the tool.
          </p>
        </div>

        <GoogleLoginButton />

        {authErrorMessage(error) ? (
          <p className="text-sm font-medium text-verdict-reject-text">
            {authErrorMessage(error)}
          </p>
        ) : null}
      </Card>
    </main>
  );
}
