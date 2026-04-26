"use client";

import { useState } from "react";

import { Card } from "@/components/ui/card";
import type {
  AdminDashboardOverview,
  PendingUser,
} from "@/lib/admin-dashboard";

type AdminDashboardPanelProps = {
  overview: AdminDashboardOverview;
};

const metricLabels = [
  ["pendingApprovals", "Pending approvals"],
  ["activeUsersLast24h", "Active users, 24h"],
  ["personaSavesLast24h", "Persona saves, 24h"],
  ["evaluationGenerationsLast24h", "Evaluation generations, 24h"],
] as const;

export function AdminDashboardPanel({ overview }: AdminDashboardPanelProps) {
  const [pendingUsers, setPendingUsers] = useState(overview.pendingUsers);
  const [pendingCount, setPendingCount] = useState(overview.pendingApprovals);
  const [actionError, setActionError] = useState<string | null>(null);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  async function updateApproval(user: PendingUser, status: "approved" | "rejected") {
    setUpdatingUserId(user.id);
    setActionError(null);

    try {
      const response = await fetch(`/api/admin/users/${user.id}/approval`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ approval_status: status }),
      });

      const data: { error?: string } = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to update user approval.");
      }

      setPendingUsers((currentUsers) =>
        currentUsers.filter((currentUser) => currentUser.id !== user.id),
      );
      setPendingCount((currentCount) => Math.max(0, currentCount - 1));
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Failed to update user approval.",
      );
    } finally {
      setUpdatingUserId(null);
    }
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="font-display text-3xl font-bold text-foreground">
          Admin Overview
        </h2>
        <p className="text-sm text-muted-foreground">
          Monitor access requests and product usage over the last 24 hours.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {metricLabels.map(([key, label]) => (
          <Card key={key} tone="muted" className="space-y-2 shadow-none">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="font-display text-4xl font-extrabold text-foreground">
              {key === "pendingApprovals" ? pendingCount : overview[key]}
            </p>
          </Card>
        ))}
      </div>

      <Card className="space-y-4">
        <div>
          <h3 className="font-display text-2xl font-bold text-foreground">
            Pending Users
          </h3>
          <p className="text-sm text-muted-foreground">
            Approve users who should be allowed into Persona Panel.
          </p>
        </div>

        {pendingUsers.length ? (
          <div className="space-y-3">
            {pendingUsers.map((user) => (
              <div
                key={user.id}
                className="flex flex-col gap-3 rounded-2xl border border-border-subtle bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {user.fullName ?? user.email}
                  </p>
                  <p className="truncate text-sm text-muted-foreground">
                    {user.email}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="rounded-2xl bg-[linear-gradient(135deg,#4d29c8,#6645d6)] px-4 py-2 text-sm font-semibold text-white transition-colors disabled:opacity-60"
                    disabled={updatingUserId === user.id}
                    onClick={() => void updateApproval(user, "approved")}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    className="rounded-2xl border border-border-subtle bg-white px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-surface-panel disabled:opacity-60"
                    disabled={updatingUserId === user.id}
                    onClick={() => void updateApproval(user, "rejected")}
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-2xl border border-border-subtle bg-surface-panel px-4 py-3 text-sm text-muted-foreground">
            No users are waiting for approval.
          </p>
        )}

        {actionError ? (
          <p className="text-sm font-medium text-verdict-reject-text">
            {actionError}
          </p>
        ) : null}
      </Card>
    </section>
  );
}
