import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";

import {
  BUYER_AUTH_NEXT_COOKIE,
  clearBuyerAuthNextCookie,
} from "@/features/buyer/auth-next-cookie";
import { mergeBuyerSessionAfterAuth } from "@/features/buyer/merge-buyer-session";
import { resolveBuyerAuthNextPath } from "@/features/buyer/resolve-auth-next";
import { env } from "@/lib/env";
import type { Database } from "@/lib/supabase/types";
import { createServiceSupabaseClient } from "@/lib/supabase/server-service";

function resolveRedirectOrigin(request: NextRequest): string {
  const origin = request.nextUrl.origin;
  const forwardedHost = request.headers.get("x-forwarded-host");
  const isLocal = process.env.NODE_ENV === "development";

  if (!isLocal && forwardedHost) {
    return `https://${forwardedHost}`;
  }

  return origin;
}

/**
 * OAuth/OTP callback for buyer magic link (SO-03 / D119 / D128).
 * Exchanges `code` (PKCE) or `token_hash`+`type` → session cookies, merges
 * anonymous hold by e-mail, then redirects to `next` (default `/sacolinha`).
 * Never opens admin gates.
 *
 * Cookies are written onto the redirect `NextResponse` so the session survives
 * the 302 (known App Router pitfall with bare `cookies().set` + redirect).
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const otpType = url.searchParams.get("type");
  const origin = resolveRedirectOrigin(request);

  const next = resolveBuyerAuthNextPath({
    queryNext: url.searchParams.get("next"),
    cookieNext: request.cookies.get(BUYER_AUTH_NEXT_COOKIE)?.value,
  });

  let destination = next;

  const buildRedirect = () => {
    const response = NextResponse.redirect(`${origin}${destination}`);
    return response;
  };

  const errorRedirect = () => {
    destination = `/entrar?erro=link&next=${encodeURIComponent(next)}`;
    const response = buildRedirect();
    clearBuyerAuthNextCookie(response);
    return response;
  };

  if (!code && !(tokenHash && otpType)) {
    console.error("Buyer magic-link callback missing code/token_hash");
    return errorRedirect();
  }

  let redirectResponse = buildRedirect();

  const supabase = createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: {
            name: string;
            value: string;
            options: CookieOptions;
          }[],
        ) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          redirectResponse = buildRedirect();
          cookiesToSet.forEach(({ name, value, options }) => {
            redirectResponse.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  let userId: string | null = null;
  let userEmail: string | null | undefined = null;

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error || !data.user) {
      console.error("Buyer magic-link exchange failed:", error);
      return errorRedirect();
    }
    userId = data.user.id;
    userEmail = data.user.email;
  } else if (tokenHash && otpType) {
    const { data, error } = await supabase.auth.verifyOtp({
      type: otpType as EmailOtpType,
      token_hash: tokenHash,
    });
    if (error || !data.user) {
      console.error("Buyer magic-link verifyOtp failed:", error);
      return errorRedirect();
    }
    userId = data.user.id;
    userEmail = data.user.email;
  }

  if (!userId) {
    console.error("Buyer magic-link callback: no user after exchange");
    return errorRedirect();
  }

  // Admin accounts must not use buyer OTP as a password bypass.
  const service = createServiceSupabaseClient();
  const { data: adminRow } = await service
    .from("admins")
    .select("id")
    .eq("auth_user_id", userId)
    .eq("is_active", true)
    .maybeSingle();

  if (adminRow) {
    destination = "/admin/login";
    await supabase.auth.signOut();
    clearBuyerAuthNextCookie(redirectResponse);
    return redirectResponse;
  }

  await mergeBuyerSessionAfterAuth({
    authUserId: userId,
    email: userEmail,
  });

  clearBuyerAuthNextCookie(redirectResponse);
  return redirectResponse;
}
