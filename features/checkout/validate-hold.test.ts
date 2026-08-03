import { describe, expect, it } from "vitest";

import {
  interpretConvertHoldResult,
  planHoldCheckoutGate,
} from "@/features/checkout/validate-hold";

const holdSessionId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const browserSessionId = "browser-session-1";
const productId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

function activeSnapshot(overrides?: {
  id?: string;
  session_id?: string;
  status?: string;
  expires_at?: string;
  items?: { product_id: string }[];
}) {
  return {
    session: {
      id: overrides?.id ?? holdSessionId,
      session_id: overrides?.session_id ?? browserSessionId,
      status: overrides?.status ?? "active",
      expires_at: overrides?.expires_at ?? "2026-08-03T16:00:00.000Z",
    },
    items: overrides?.items ?? [{ product_id: productId }],
  };
}

describe("planHoldCheckoutGate", () => {
  const nowMs = Date.parse("2026-08-03T15:50:00.000Z");

  it("aceita hold ativo da mesma sessão com ≥1 item", () => {
    const result = planHoldCheckoutGate({
      holdSessionId,
      browserSessionId,
      snapshot: activeSnapshot(),
      nowMs,
    });

    expect(result).toEqual({
      ok: true,
      holdSessionId,
      browserSessionId,
      productIds: [productId],
      expiresAt: "2026-08-03T16:00:00.000Z",
    });
  });

  it("rejeita holdSessionId ausente", () => {
    const result = planHoldCheckoutGate({
      holdSessionId: undefined,
      browserSessionId,
      snapshot: activeSnapshot(),
      nowMs,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("validation");
  });

  it("rejeita cookie ausente (wrong/stale session)", () => {
    const result = planHoldCheckoutGate({
      holdSessionId,
      browserSessionId: null,
      snapshot: activeSnapshot(),
      nowMs,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("reservation_expired");
  });

  it("rejeita hold de outra sessão do navegador", () => {
    const result = planHoldCheckoutGate({
      holdSessionId,
      browserSessionId: "other-browser",
      snapshot: activeSnapshot(),
      nowMs,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("reservation_expired");
  });

  it("rejeita holdSessionId que não bate com o snapshot", () => {
    const result = planHoldCheckoutGate({
      holdSessionId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      browserSessionId,
      snapshot: activeSnapshot(),
      nowMs,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("reservation_expired");
  });

  it("rejeita sessão expirada (stale TTL)", () => {
    const result = planHoldCheckoutGate({
      holdSessionId,
      browserSessionId,
      snapshot: activeSnapshot({ expires_at: "2026-08-03T15:00:00.000Z" }),
      nowMs,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("reservation_expired");
  });

  it("rejeita hold vazio", () => {
    const result = planHoldCheckoutGate({
      holdSessionId,
      browserSessionId,
      snapshot: activeSnapshot({ items: [] }),
      nowMs,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("empty_cart");
  });
});

describe("interpretConvertHoldResult", () => {
  it("happy-path convert → ok (não implica sold)", () => {
    expect(
      interpretConvertHoldResult({
        status: "ok",
        holdSessionId,
        orderId: "order-1",
      }),
    ).toEqual({ ok: true });
  });

  it("expired convert → reservation_expired", () => {
    const result = interpretConvertHoldResult({ status: "expired" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("reservation_expired");
  });
});
