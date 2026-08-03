import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  remainingHoldMinutes,
  resolvePosLookupQuery,
} from "@/features/pos/resolve-lookup-query";
import { deriveSellGate } from "@/features/pos/sell-gate";

vi.mock("server-only", () => ({}));

const from = vi.fn();

vi.mock("@/lib/supabase/server-service", () => ({
  createServiceSupabaseClient: () => ({ from }),
}));

import { lookupProductForPos } from "@/features/pos/lookup-product";

type QueryResult = { data: unknown; error: unknown };

function chain(result: QueryResult) {
  const builder: Record<string, unknown> = {};
  const self = () => builder;
  for (const method of [
    "select",
    "insert",
    "update",
    "delete",
    "eq",
    "in",
    "like",
    "order",
    "limit",
  ]) {
    builder[method] = vi.fn(self);
  }
  builder.maybeSingle = vi.fn().mockResolvedValue(result);
  builder.single = vi.fn().mockResolvedValue(result);
  builder.then = (
    resolve: (value: QueryResult) => unknown,
    reject?: (reason: unknown) => unknown,
  ) => Promise.resolve(result).then(resolve, reject);
  return builder;
}

const PRODUCT_ID = "11111111-1111-4111-8111-111111111111";
const HOLD_ID = "44444444-4444-4444-8444-444444444444";
const NOW = Date.parse("2026-08-03T12:00:00.000Z");

describe("resolvePosLookupQuery", () => {
  it("detects UUID product id", () => {
    expect(resolvePosLookupQuery(PRODUCT_ID)).toEqual({
      kind: "id",
      id: PRODUCT_ID,
    });
  });

  it("normalizes RP staff codes", () => {
    expect(resolvePosLookupQuery(" rp-000381 ")).toEqual({
      kind: "staff_code",
      staffCode: "RP-000381",
    });
  });

  it("extracts staff code from Passport URL", () => {
    expect(
      resolvePosLookupQuery(
        "https://repetipetit.com.br/admin/passport/RP-000381",
      ),
    ).toEqual({ kind: "staff_code", staffCode: "RP-000381" });
  });

  it("extracts product id from POS deep link", () => {
    expect(
      resolvePosLookupQuery(`/admin/pos?product=${PRODUCT_ID}`),
    ).toEqual({ kind: "id", id: PRODUCT_ID });
  });
});

describe("remainingHoldMinutes", () => {
  it("ceils remaining minutes", () => {
    expect(
      remainingHoldMinutes("2026-08-03T12:10:01.000Z", NOW),
    ).toBe(11);
    expect(
      remainingHoldMinutes("2026-08-03T11:59:00.000Z", NOW),
    ).toBe(0);
  });
});

describe("deriveSellGate", () => {
  it("blocks sold or paid claims", () => {
    expect(
      deriveSellGate({
        status: "sold",
        hasPendingOnlineOrder: false,
        hasPaidOrder: false,
      }),
    ).toBe("sold_or_paid");
    expect(
      deriveSellGate({
        status: "available",
        hasPendingOnlineOrder: false,
        hasPaidOrder: true,
      }),
    ).toBe("sold_or_paid");
  });

  it("surfaces pending_payment before hold", () => {
    expect(
      deriveSellGate({
        status: "hold",
        hasPendingOnlineOrder: true,
        hasPaidOrder: false,
      }),
    ).toBe("pending_payment");
  });

  it("allows available for sell", () => {
    expect(
      deriveSellGate({
        status: "available",
        hasPendingOnlineOrder: false,
        hasPaidOrder: false,
      }),
    ).toBe("available");
  });
});

describe("lookupProductForPos", () => {
  beforeEach(() => {
    from.mockReset();
  });

  it("returns hold session data when product is hold", async () => {
    const expiresAt = "2026-08-03T12:15:00.000Z";

    const productQuery = chain({
      data: {
        id: PRODUCT_ID,
        name: "Vestido floral",
        staff_code: "RP-000381",
        brand: "Zara",
        size_label: "4 anos",
        condition: "seminovo",
        price: 45,
        cover_image_url: "https://cdn.example/cover.jpg",
        status: "hold",
        sold_channel: null,
      },
      error: null,
    });

    const holdQuery = chain({
      data: {
        hold_session_id: HOLD_ID,
        hold_sessions: {
          id: HOLD_ID,
          session_id: "cookie-session-abc",
          expires_at: expiresAt,
          status: "active",
        },
      },
      error: null,
    });

    const claimsQuery = chain({
      data: [],
      error: null,
    });

    from.mockImplementation((table: string) => {
      if (table === "products") return productQuery;
      if (table === "hold_items") return holdQuery;
      if (table === "order_items") return claimsQuery;
      return chain({ data: null, error: null });
    });

    const result = await lookupProductForPos("RP-000381", NOW);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.product.status).toBe("hold");
    expect(result.data.product.staffCode).toBe("RP-000381");
    expect(result.data.hold).toEqual({
      id: HOLD_ID,
      sessionId: "cookie-session-abc",
      expiresAt,
      remainingMinutes: 15,
    });
    expect(result.data.sellGate).toBe("hold");
    expect(result.data.hasPendingOnlineOrder).toBe(false);
  });

  it("returns not_found when staff code misses", async () => {
    from.mockImplementation(() =>
      chain({ data: null, error: null }),
    );

    const result = await lookupProductForPos("RP-999999", NOW);
    expect(result).toEqual({
      ok: false,
      error: "Peça não encontrada.",
      code: "not_found",
    });
  });
});
