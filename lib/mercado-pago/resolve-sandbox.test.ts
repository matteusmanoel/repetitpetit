import { afterEach, describe, expect, it, vi } from "vitest";

import {
  resetMercadoPagoSandboxCacheForTests,
  resolveMercadoPagoIsSandbox,
} from "@/lib/mercado-pago/resolve-sandbox";

describe("resolveMercadoPagoIsSandbox", () => {
  afterEach(() => {
    resetMercadoPagoSandboxCacheForTests();
    vi.unstubAllGlobals();
  });

  it("returns true when configuredIsSandbox is true without calling API", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      resolveMercadoPagoIsSandbox("APP_USR-abc", true),
    ).resolves.toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns true for TEST- access token without calling API", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      resolveMercadoPagoIsSandbox("TEST-abc", false),
    ).resolves.toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("detects APP_USR test seller via /users/me tags", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 1,
        tags: ["test_user", "normal"],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      resolveMercadoPagoIsSandbox("APP_USR-test-seller-token", false),
    ).resolves.toBe(true);
    expect(fetchMock).toHaveBeenCalledOnce();

    // Cached — second call skips network.
    await expect(
      resolveMercadoPagoIsSandbox("APP_USR-test-seller-token", false),
    ).resolves.toBe(true);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("returns false when /users/me has no test_user tag", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ id: 1, tags: ["normal"] }),
      }),
    );

    await expect(
      resolveMercadoPagoIsSandbox("APP_USR-prod-seller", false),
    ).resolves.toBe(false);
  });
});
