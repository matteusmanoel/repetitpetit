import { describe, expect, it } from "vitest";

import { shouldForwardAuthParamsToCallback } from "@/lib/supabase/auth-callback-forward";

function params(entries: Record<string, string>) {
  const sp = new URLSearchParams(entries);
  return {
    has(name: string) {
      return sp.has(name);
    },
  };
}

describe("shouldForwardAuthParamsToCallback", () => {
  it("forwards Site URL / stray paths with ?code= to buyer callback (D129)", () => {
    expect(
      shouldForwardAuthParamsToCallback("/", params({ code: "abc" })),
    ).toBe(true);
    expect(
      shouldForwardAuthParamsToCallback(
        "/sacolinha",
        params({ code: "abc" }),
      ),
    ).toBe(true);
  });

  it("forwards token_hash+type on non-callback paths", () => {
    expect(
      shouldForwardAuthParamsToCallback(
        "/",
        params({ token_hash: "h", type: "magiclink" }),
      ),
    ).toBe(true);
  });

  it("does not re-forward /auth/callback", () => {
    expect(
      shouldForwardAuthParamsToCallback(
        "/auth/callback",
        params({ code: "abc" }),
      ),
    ).toBe(false);
  });

  /**
   * Regression: D129 middleware hijacked admin password recovery.
   * Symptom: click reset email → /entrar?erro=link&next=/sacolinha
   * ("Não foi possível validar o link…").
   */
  it("does NOT forward /auth/reset (password recovery owns the tokens)", () => {
    expect(
      shouldForwardAuthParamsToCallback(
        "/auth/reset",
        params({ code: "recovery-code" }),
      ),
    ).toBe(false);
    expect(
      shouldForwardAuthParamsToCallback(
        "/auth/reset",
        params({ token_hash: "h", type: "recovery" }),
      ),
    ).toBe(false);
  });
});
