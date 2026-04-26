import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { upsertUserProfileForUser } from "@/lib/auth";

function redirectOrigin(request: Request, origin: string) {
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = request.headers.get("host");
  const vercelUrl = process.env.VERCEL_URL;

  if (forwardedHost) {
    const protocol =
      forwardedProto && forwardedProto.length > 0
        ? forwardedProto
        : forwardedHost.includes("localhost")
          ? "http"
          : "https";

    return `${protocol}://${forwardedHost}`;
  }

  if (host) {
    const protocol =
      forwardedProto && forwardedProto.length > 0
        ? forwardedProto
        : host.includes("localhost")
          ? "http"
          : "https";

    return `${protocol}://${host}`;
  }

  if (vercelUrl) {
    return `https://${vercelUrl}`;
  }

  return origin;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");
  const safeNext = next?.startsWith("/") ? next : "/dashboard";
  const baseUrl = redirectOrigin(request, origin);

  if (!code) {
    return NextResponse.redirect(`${baseUrl}/login?error=auth-code`);
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.redirect(`${baseUrl}/login?error=auth-code`);
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(`${baseUrl}/login?error=auth-code`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${baseUrl}/login?error=auth-code`);
  }

  const profile = await upsertUserProfileForUser(user);

  if (!profile) {
    return NextResponse.redirect(`${baseUrl}/login?error=auth-code`);
  }

  if (profile.approvalStatus === "approved") {
    return NextResponse.redirect(`${baseUrl}${safeNext}`);
  }

  if (profile.approvalStatus === "rejected") {
    return NextResponse.redirect(`${baseUrl}/login?error=access-rejected`);
  }

  return NextResponse.redirect(`${baseUrl}/pending-approval`);
}
