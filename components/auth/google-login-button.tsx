"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase";

export function GoogleLoginButton() {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function signInWithGoogle() {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        throw error;
      }
    } catch (error) {
      setIsLoading(false);
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to start Google sign in.",
      );
    }
  }

  return (
    <div className="space-y-3">
      <Button className="w-full" onClick={signInWithGoogle} disabled={isLoading}>
        {isLoading ? "Opening Google..." : "Continue with Google"}
      </Button>
      {errorMessage ? (
        <p className="text-sm font-medium text-verdict-reject-text">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
