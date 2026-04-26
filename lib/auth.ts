import "server-only";

import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";

import {
  createSupabaseServerClient,
  getSupabaseAdminClient,
} from "@/lib/supabase-server";

export type UserRole = "admin" | "user";
export type ApprovalStatus = "pending" | "approved" | "rejected";

export type UserProfile = {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  role: UserRole;
  approvalStatus: ApprovalStatus;
  approvedAt: string | null;
  approvedBy: string | null;
  rejectedAt: string | null;
  rejectedBy: string | null;
  lastSeenAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AuthContext = {
  user: User;
  profile: UserProfile;
  isAdmin: boolean;
  viewer: {
    userId: string;
    role: UserRole;
    isAdmin: boolean;
  };
};

type UserProfileRow = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  approval_status: ApprovalStatus;
  approved_at: string | null;
  approved_by: string | null;
  rejected_at: string | null;
  rejected_by: string | null;
  last_seen_at: string | null;
  created_at: string;
  updated_at: string;
};

export class AuthAccessError extends Error {
  status: number;
  code: string;
  redirectTo: string | null;

  constructor(message: string, status: number, code: string, redirectTo: string | null) {
    super(message);
    this.name = "AuthAccessError";
    this.status = status;
    this.code = code;
    this.redirectTo = redirectTo;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

function getAdminEmails() {
  return new Set(
    (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isAdminEmail(email: string | null | undefined) {
  if (!email) {
    return false;
  }

  return getAdminEmails().has(email.trim().toLowerCase());
}

function mapProfile(row: UserProfileRow): UserProfile {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    avatarUrl: row.avatar_url,
    role: row.role,
    approvalStatus: row.approval_status,
    approvedAt: row.approved_at,
    approvedBy: row.approved_by,
    rejectedAt: row.rejected_at,
    rejectedBy: row.rejected_by,
    lastSeenAt: row.last_seen_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function readUserName(user: User) {
  const metadata = user.user_metadata as Record<string, unknown>;
  const fullName = metadata.full_name ?? metadata.name;

  return typeof fullName === "string" && fullName.trim()
    ? fullName.trim()
    : null;
}

function readAvatarUrl(user: User) {
  const metadata = user.user_metadata as Record<string, unknown>;
  const avatarUrl = metadata.avatar_url ?? metadata.picture;

  return typeof avatarUrl === "string" && avatarUrl.trim()
    ? avatarUrl.trim()
    : null;
}

export async function upsertUserProfileForUser(user: User) {
  const supabase = getSupabaseAdminClient();
  const email = user.email?.trim().toLowerCase() ?? "";

  if (!supabase || !email) {
    return null;
  }

  const fullName = readUserName(user);
  const avatarUrl = readAvatarUrl(user);
  const now = new Date().toISOString();
  const shouldBeAdmin = isAdminEmail(email);

  const { data: existing } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (existing) {
    const updatePayload: Record<string, unknown> = {
      email,
      full_name: fullName,
      avatar_url: avatarUrl,
      updated_at: now,
    };

    if (shouldBeAdmin) {
      updatePayload.role = "admin";
      updatePayload.approval_status = "approved";
      updatePayload.approved_at = (existing as UserProfileRow).approved_at ?? now;
      updatePayload.approved_by = user.id;
      updatePayload.rejected_at = null;
      updatePayload.rejected_by = null;
    }

    const { data, error } = await supabase
      .from("user_profiles")
      .update(updatePayload)
      .eq("id", user.id)
      .select("*")
      .single();

    if (error || !data) {
      return null;
    }

    return mapProfile(data as UserProfileRow);
  }

  const role: UserRole = shouldBeAdmin ? "admin" : "user";
  const approvalStatus: ApprovalStatus = shouldBeAdmin ? "approved" : "pending";

  const { data, error } = await supabase
    .from("user_profiles")
    .insert({
      id: user.id,
      email,
      full_name: fullName,
      avatar_url: avatarUrl,
      role,
      approval_status: approvalStatus,
      approved_at: shouldBeAdmin ? now : null,
      approved_by: shouldBeAdmin ? user.id : null,
      rejected_at: null,
      rejected_by: null,
      last_seen_at: shouldBeAdmin ? now : null,
      created_at: now,
      updated_at: now,
    })
    .select("*")
    .single();

  if (error || !data) {
    return null;
  }

  return mapProfile(data as UserProfileRow);
}

export async function getCurrentAuthContext() {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    throw new AuthAccessError(
      "Missing Supabase auth config.",
      500,
      "missing_config",
      null,
    );
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  const profile = await upsertUserProfileForUser(user);
  if (!profile) {
    throw new AuthAccessError(
      "Unable to load your access profile.",
      500,
      "profile_unavailable",
      null,
    );
  }

  return {
    user,
    profile,
    isAdmin: profile.role === "admin",
    viewer: {
      userId: user.id,
      role: profile.role,
      isAdmin: profile.role === "admin",
    },
  } satisfies AuthContext;
}

async function touchLastSeen(userId: string) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return;
  }

  const now = new Date().toISOString();
  await supabase
    .from("user_profiles")
    .update({
      last_seen_at: now,
      updated_at: now,
    })
    .eq("id", userId);
}

export async function requireApprovedUser({
  touch = true,
}: {
  touch?: boolean;
} = {}) {
  const context = await getCurrentAuthContext();

  if (!context) {
    throw new AuthAccessError(
      "Please sign in to continue.",
      401,
      "unauthenticated",
      "/login",
    );
  }

  if (context.profile.approvalStatus === "pending") {
    throw new AuthAccessError(
      "Your account is pending admin approval.",
      403,
      "approval_pending",
      "/pending-approval",
    );
  }

  if (context.profile.approvalStatus === "rejected") {
    throw new AuthAccessError(
      "Your account was not approved for this workspace.",
      403,
      "approval_rejected",
      "/login?error=access-rejected",
    );
  }

  if (touch) {
    await touchLastSeen(context.user.id);
  }

  return context;
}

export async function requireAdmin(options: { touch?: boolean } = {}) {
  const context = await requireApprovedUser(options);

  if (!context.isAdmin) {
    throw new AuthAccessError(
      "Admin access is required.",
      403,
      "admin_required",
      "/dashboard",
    );
  }

  return context;
}

export function authErrorResponse(error: unknown) {
  if (error instanceof AuthAccessError) {
    return NextResponse.json(
      {
        error: error.message,
        code: error.code,
      },
      { status: error.status },
    );
  }

  return NextResponse.json(
    { error: "Authentication failed" },
    { status: 500 },
  );
}

export function authRedirectTarget(error: unknown) {
  if (error instanceof AuthAccessError) {
    return error.redirectTo ?? "/login";
  }

  throw error;
}
