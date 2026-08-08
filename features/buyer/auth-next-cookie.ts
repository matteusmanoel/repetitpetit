import "server-only";

import { cookies } from "next/headers";
import type { NextResponse } from "next/server";

import { sanitizeBuyerNextPath } from "@/features/buyer/constants";
import { env } from "@/lib/env";

/** Short-lived cookie backup when Supabase drops `?next=` on redirect. */
export const BUYER_AUTH_NEXT_COOKIE = "rp_buyer_auth_next";

const MAX_AGE_SECONDS = 60 * 60; // 1h — aligns with typical magic-link window

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: env.NEXT_PUBLIC_SITE_URL.startsWith("https://"),
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  };
}

/** Persist intended landing before `signInWithOtp` (Server Action). */
export async function setBuyerAuthNextCookie(nextPath: string): Promise<void> {
  const jar = await cookies();
  jar.set(
    BUYER_AUTH_NEXT_COOKIE,
    sanitizeBuyerNextPath(nextPath),
    cookieOptions(),
  );
}

export async function peekBuyerAuthNextCookie(): Promise<string | null> {
  const jar = await cookies();
  const value = jar.get(BUYER_AUTH_NEXT_COOKIE)?.value?.trim();
  return value && value.length > 0 ? value : null;
}

/** Clear backup cookie on the redirect response after successful exchange. */
export function clearBuyerAuthNextCookie(response: NextResponse): void {
  response.cookies.set(BUYER_AUTH_NEXT_COOKIE, "", {
    ...cookieOptions(),
    maxAge: 0,
  });
}
