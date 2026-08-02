import { describe, expect, it } from "vitest";

import { loadEnv } from "@/lib/env/load-server";
import { loadPublicEnv } from "@/lib/env/public";

const validPublicEnv = {
  NEXT_PUBLIC_SUPABASE_URL: "https://example-project.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
  NEXT_PUBLIC_SITE_URL: "https://repetipetit.com.br",
  NEXT_PUBLIC_STORE_NAME: "Repeti Petit",
};

const validRequiredEnv = {
  ...validPublicEnv,
  SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
};

describe("loadPublicEnv", () => {
  it("succeeds without SUPABASE_SERVICE_ROLE_KEY (client-safe)", () => {
    const env = loadPublicEnv(validPublicEnv);

    expect(env.NEXT_PUBLIC_SUPABASE_URL).toBe(
      validPublicEnv.NEXT_PUBLIC_SUPABASE_URL,
    );
    expect(
      "SUPABASE_SERVICE_ROLE_KEY" in (env as Record<string, unknown>),
    ).toBe(false);
  });

  it("throws when a required public var is missing", () => {
    const incomplete: Record<string, string | undefined> = {
      ...validPublicEnv,
    };
    delete incomplete.NEXT_PUBLIC_SUPABASE_URL;

    expect(() => loadPublicEnv(incomplete)).toThrowError(
      /NEXT_PUBLIC_SUPABASE_URL/,
    );
  });

  it("does not require service role even when other keys are empty", () => {
    expect(() => loadPublicEnv({})).toThrowError(/NEXT_PUBLIC_SUPABASE_URL/);
    expect(() => loadPublicEnv({})).not.toThrowError(
      /SUPABASE_SERVICE_ROLE_KEY/,
    );
  });
});

describe("loadEnv", () => {
  it("parses a fully valid env object, including optional vars", () => {
    const raw = {
      ...validRequiredEnv,
      MERCADOPAGO_ACCESS_TOKEN: "mp-token",
      NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY: "mp-public-key",
      MERCADOPAGO_WEBHOOK_SECRET: "mp-secret",
      NEXT_PUBLIC_STORE_WHATSAPP: "554599999999",
    };

    const env = loadEnv(raw);

    expect(env.NEXT_PUBLIC_SUPABASE_URL).toBe(raw.NEXT_PUBLIC_SUPABASE_URL);
    expect(env.NEXT_PUBLIC_STORE_WHATSAPP).toBe("554599999999");
  });

  it("succeeds when only the always-required vars are present", () => {
    const env = loadEnv(validRequiredEnv);

    expect(env.NEXT_PUBLIC_STORE_NAME).toBe("Repeti Petit");
    expect(env.MERCADOPAGO_ACCESS_TOKEN).toBeUndefined();
    expect(env.NEXT_PUBLIC_STORE_WHATSAPP).toBeUndefined();
  });

  it("throws a descriptive error when a required var is missing", () => {
    const incomplete: Record<string, string | undefined> = {
      ...validRequiredEnv,
    };
    delete incomplete.NEXT_PUBLIC_SUPABASE_URL;

    expect(() => loadEnv(incomplete)).toThrowError(/NEXT_PUBLIC_SUPABASE_URL/);
  });

  it("throws when a required var is an empty string", () => {
    expect(() =>
      loadEnv({ ...validRequiredEnv, SUPABASE_SERVICE_ROLE_KEY: "" }),
    ).toThrowError(/SUPABASE_SERVICE_ROLE_KEY/);
  });

  it("throws when NEXT_PUBLIC_SITE_URL is not a valid URL", () => {
    expect(() =>
      loadEnv({ ...validRequiredEnv, NEXT_PUBLIC_SITE_URL: "not-a-url" }),
    ).toThrowError(/NEXT_PUBLIC_SITE_URL/);
  });

  it("throws when NEXT_PUBLIC_STORE_WHATSAPP has a non-numeric format", () => {
    expect(() =>
      loadEnv({
        ...validRequiredEnv,
        NEXT_PUBLIC_STORE_WHATSAPP: "+55 (45) 99999-9999",
      }),
    ).toThrowError(/NEXT_PUBLIC_STORE_WHATSAPP/);
  });

  it("accepts a NEXT_PUBLIC_STORE_WHATSAPP with digits only, DDI+DDD+number", () => {
    const env = loadEnv({
      ...validRequiredEnv,
      NEXT_PUBLIC_STORE_WHATSAPP: "554599999999",
    });

    expect(env.NEXT_PUBLIC_STORE_WHATSAPP).toBe("554599999999");
  });

  it("lists every missing required var in the thrown error", () => {
    expect(() => loadEnv({})).toThrowError(
      /NEXT_PUBLIC_SUPABASE_URL[\s\S]*NEXT_PUBLIC_SUPABASE_ANON_KEY[\s\S]*NEXT_PUBLIC_SITE_URL[\s\S]*NEXT_PUBLIC_STORE_NAME[\s\S]*SUPABASE_SERVICE_ROLE_KEY/,
    );
  });
});
