import {
  BUYER_DEFAULT_NEXT_PATH,
  sanitizeBuyerNextPath,
} from "@/features/buyer/constants";

/**
 * Resolve post-magic-link landing path (D119 / D128).
 * Prefer `?next=` on `/auth/callback`; fall back to short-lived cookie when
 * Supabase strips query params from `emailRedirectTo` / Site URL fallback.
 */
export function resolveBuyerAuthNextPath(input: {
  queryNext?: string | null;
  cookieNext?: string | null;
}): string {
  const fromQuery = input.queryNext?.trim();
  if (fromQuery) {
    return sanitizeBuyerNextPath(fromQuery);
  }

  const fromCookie = input.cookieNext?.trim();
  if (fromCookie) {
    return sanitizeBuyerNextPath(fromCookie);
  }

  return BUYER_DEFAULT_NEXT_PATH;
}

/** Build `/auth/callback` URL with `next` for `emailRedirectTo`. */
export function buildBuyerAuthCallbackUrl(
  siteUrl: string,
  nextPath: string,
): string {
  const base = siteUrl.replace(/\/$/, "");
  const next = sanitizeBuyerNextPath(nextPath);
  return `${base}/auth/callback?next=${encodeURIComponent(next)}`;
}
