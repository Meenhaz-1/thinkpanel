import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/top-bar";
import {
  authRedirectTarget,
  requireApprovedUser,
  type AuthContext,
} from "@/lib/auth";

async function getAuthContext(): Promise<AuthContext> {
  try {
    return await requireApprovedUser();
  } catch (error) {
    redirect(authRedirectTarget(error));
  }
}

export default async function ProductLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const { profile } = await getAuthContext();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="min-h-screen lg:flex">
        <Sidebar isAdmin={profile.role === "admin"} />
        <div className="min-w-0 flex-1">
          <TopBar
            email={profile.email}
            isAdmin={profile.role === "admin"}
          />
          <main>{children}</main>
        </div>
      </div>
    </div>
  );
}
