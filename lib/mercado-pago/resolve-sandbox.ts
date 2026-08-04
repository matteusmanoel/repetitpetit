const MERCADOPAGO_API_BASE = "https://api.mercadopago.com";

let cachedTestSeller: boolean | null = null;
let cachedTokenFingerprint: string | null = null;

/**
 * True when the Access Token is a test seller (`TEST-…` or `/users/me` tag
 * `test_user`). APP_USR tokens from test credentials look like production
 * prefixes — probing `/users/me` is required.
 *
 * Cached per process + token fingerprint so preference creation stays cheap.
 */
export async function resolveMercadoPagoIsSandbox(
  accessToken: string,
  configuredIsSandbox: boolean,
): Promise<boolean> {
  if (configuredIsSandbox) return true;
  if (accessToken.startsWith("TEST-")) return true;

  const fingerprint = accessToken.slice(0, 24);
  if (
    cachedTestSeller !== null &&
    cachedTokenFingerprint === fingerprint
  ) {
    return cachedTestSeller;
  }

  try {
    const response = await fetch(`${MERCADOPAGO_API_BASE}/users/me`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      cachedTokenFingerprint = fingerprint;
      cachedTestSeller = false;
      return false;
    }

    const raw: unknown = await response.json().catch(() => null);
    const tags =
      raw &&
      typeof raw === "object" &&
      Array.isArray((raw as { tags?: unknown }).tags)
        ? ((raw as { tags: unknown[] }).tags)
        : [];

    const isTest = tags.some(
      (tag) => typeof tag === "string" && tag === "test_user",
    );

    cachedTokenFingerprint = fingerprint;
    cachedTestSeller = isTest;
    return isTest;
  } catch {
    cachedTokenFingerprint = fingerprint;
    cachedTestSeller = false;
    return false;
  }
}

/** Test-only: reset module cache between Vitest cases. */
export function resetMercadoPagoSandboxCacheForTests(): void {
  cachedTestSeller = null;
  cachedTokenFingerprint = null;
}
