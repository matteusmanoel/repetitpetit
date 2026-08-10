/**
 * D129: when Auth lands on Site URL (or any path) with `?code=` / `token_hash`,
 * middleware forwards to `/auth/callback` so buyer magic-link can exchange.
 *
 * Password recovery must stay on `/auth/reset` — that page owns the tokens and
 * must not enter the buyer callback (which errors to `/entrar?erro=link`).
 */
export function shouldForwardAuthParamsToCallback(
  pathname: string,
  searchParams: { has(name: string): boolean },
): boolean {
  if (pathname === "/auth/callback" || pathname === "/auth/reset") {
    return false;
  }

  const hasAuthCode = searchParams.has("code");
  const hasTokenHash =
    searchParams.has("token_hash") && searchParams.has("type");

  return hasAuthCode || hasTokenHash;
}
