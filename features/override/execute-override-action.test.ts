import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const from = vi.fn();
const rpc = vi.fn();

vi.mock("@/lib/supabase/server-service", () => ({
  createServiceSupabaseClient: () => ({ from, rpc }),
}));

import { assertOverrideAllowed } from "@/features/override/assert-override-allowed";
import { executeOverrideAction } from "@/features/override/execute-override-action";
import { isOverrideActionVisible } from "@/features/override/visibility";

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
  // Awaitable query builders (e.g. .in().eq().order())
  builder.then = (
    resolve: (value: QueryResult) => unknown,
    reject?: (reason: unknown) => unknown,
  ) => Promise.resolve(result).then(resolve, reject);
  return builder;
}

const PRODUCT_ID = "11111111-1111-4111-8111-111111111111";
const STAFF_ID = "22222222-2222-4222-8222-222222222222";
const ORDER_ID = "33333333-3333-4333-8333-333333333333";
const HOLD_ID = "44444444-4444-4444-8444-444444444444";
const EVENT_ID = "55555555-5555-4555-8555-555555555555";

describe("isOverrideActionVisible", () => {
  it("shows for hold or pending online order", () => {
    expect(
      isOverrideActionVisible({ productStatus: "hold" }),
    ).toBe(true);
    expect(
      isOverrideActionVisible({
        productStatus: "available",
        hasPendingOnlineOrder: true,
      }),
    ).toBe(true);
    expect(
      isOverrideActionVisible({ productStatus: "available" }),
    ).toBe(false);
    expect(
      isOverrideActionVisible({ productStatus: "sold" }),
    ).toBe(false);
  });
});

describe("executeOverrideAction", () => {
  beforeEach(() => {
    from.mockReset();
    rpc.mockReset();
  });

  it("blocks paid product / order with already_paid (calls assertOverrideAllowed)", async () => {
    const gate = assertOverrideAllowed({ status: "paid" });
    expect(gate).toEqual({ ok: false, reason: "already_paid" });

    const productQuery = chain({
      data: { id: PRODUCT_ID, status: "available" },
      error: null,
    });
    const itemsQuery = chain({
      data: [{ order_id: ORDER_ID }],
      error: null,
    });
    const ordersQuery = chain({
      data: [
        {
          id: ORDER_ID,
          status: "paid",
          channel: "online",
          created_at: "2026-08-03T12:00:00Z",
        },
      ],
      error: null,
    });

    from.mockImplementation((table: string) => {
      if (table === "products") return productQuery;
      if (table === "order_items") return itemsQuery;
      if (table === "orders") return ordersQuery;
      return chain({ data: null, error: null });
    });

    const result = await executeOverrideAction({
      productId: PRODUCT_ID,
      staffId: STAFF_ID,
      reason: "Cliente na loja quer a peça",
    });

    expect(result).toEqual({
      ok: false,
      reason: "already_paid",
      error: "Pedido já pago — override não permitido.",
    });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("blocks when product status is sold without calling RPC", async () => {
    const productQuery = chain({
      data: { id: PRODUCT_ID, status: "sold" },
      error: null,
    });
    from.mockImplementation((table: string) => {
      if (table === "products") return productQuery;
      return chain({ data: null, error: null });
    });

    const result = await executeOverrideAction({
      productId: PRODUCT_ID,
      staffId: STAFF_ID,
      reason: "Cliente na loja quer a peça",
    });

    expect(result).toMatchObject({ ok: false, reason: "already_paid" });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("releases hold + inserts override_event via RPC", async () => {
    const productQuery = chain({
      data: { id: PRODUCT_ID, status: "hold" },
      error: null,
    });
    const itemsQuery = chain({ data: [], error: null });
    const ordersQuery = chain({ data: [], error: null });

    from.mockImplementation((table: string) => {
      if (table === "products") return productQuery;
      if (table === "order_items") return itemsQuery;
      if (table === "orders") return ordersQuery;
      return chain({ data: null, error: null });
    });

    rpc.mockResolvedValueOnce({
      data: {
        status: "ok",
        outcome: "applied",
        override_event_id: EVENT_ID,
        affected_hold_session_id: HOLD_ID,
        affected_order_id: null,
      },
      error: null,
    });

    const info = vi.spyOn(console, "info").mockImplementation(() => {});

    const result = await executeOverrideAction({
      productId: PRODUCT_ID,
      staffId: STAFF_ID,
      reason: "Cliente na loja quer a peça",
    });

    expect(rpc).toHaveBeenCalledWith("execute_override_action", {
      p_product_id: PRODUCT_ID,
      p_staff_id: STAFF_ID,
      p_reason: "Cliente na loja quer a peça",
      p_context: null,
    });
    expect(result).toEqual({
      ok: true,
      outcome: "applied",
      overrideEventId: EVENT_ID,
      affectedHoldSessionId: HOLD_ID,
      affectedOrderId: null,
    });
    expect(info).toHaveBeenCalled();
    info.mockRestore();
  });

  it("hold-only override succeeds with no order cancellation", async () => {
    // assertOverrideAllowed(null) allows hold-only
    expect(assertOverrideAllowed(null)).toEqual({ ok: true });

    const productQuery = chain({
      data: { id: PRODUCT_ID, status: "hold" },
      error: null,
    });
    const itemsQuery = chain({ data: [], error: null });

    from.mockImplementation((table: string) => {
      if (table === "products") return productQuery;
      if (table === "order_items") return itemsQuery;
      return chain({ data: [], error: null });
    });

    rpc.mockResolvedValueOnce({
      data: {
        status: "ok",
        outcome: "applied",
        override_event_id: EVENT_ID,
        affected_hold_session_id: HOLD_ID,
        affected_order_id: null,
      },
      error: null,
    });

    vi.spyOn(console, "info").mockImplementation(() => {});

    const result = await executeOverrideAction({
      productId: PRODUCT_ID,
      staffId: STAFF_ID,
      reason: "Liberar hold para venda física",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.affectedOrderId).toBeNull();
      expect(result.affectedHoldSessionId).toBe(HOLD_ID);
      expect(result.overrideEventId).toBe(EVENT_ID);
    }
  });

  it("cancels pending online order path (RPC returns affected order)", async () => {
    const productQuery = chain({
      data: { id: PRODUCT_ID, status: "hold" },
      error: null,
    });
    const itemsQuery = chain({
      data: [{ order_id: ORDER_ID }],
      error: null,
    });
    const ordersQuery = chain({
      data: [
        {
          id: ORDER_ID,
          status: "pending_payment",
          channel: "online",
          created_at: "2026-08-03T12:00:00Z",
        },
      ],
      error: null,
    });

    from.mockImplementation((table: string) => {
      if (table === "products") return productQuery;
      if (table === "order_items") return itemsQuery;
      if (table === "orders") return ordersQuery;
      return chain({ data: null, error: null });
    });

    rpc.mockResolvedValueOnce({
      data: {
        status: "ok",
        outcome: "applied",
        override_event_id: EVENT_ID,
        affected_hold_session_id: HOLD_ID,
        affected_order_id: ORDER_ID,
      },
      error: null,
    });

    vi.spyOn(console, "info").mockImplementation(() => {});

    const result = await executeOverrideAction({
      productId: PRODUCT_ID,
      staffId: STAFF_ID,
      reason: "Cliente na loja — cancelar pending",
    });

    expect(assertOverrideAllowed({ status: "pending_payment" })).toEqual({
      ok: true,
    });
    expect(result).toEqual({
      ok: true,
      outcome: "applied",
      overrideEventId: EVENT_ID,
      affectedHoldSessionId: HOLD_ID,
      affectedOrderId: ORDER_ID,
    });
  });

  it("double override is idempotent (noop, no second override_event)", async () => {
    const productQuery = chain({
      data: { id: PRODUCT_ID, status: "available" },
      error: null,
    });
    const itemsQuery = chain({ data: [], error: null });

    from.mockImplementation((table: string) => {
      if (table === "products") return productQuery;
      if (table === "order_items") return itemsQuery;
      return chain({ data: [], error: null });
    });

    rpc.mockResolvedValueOnce({
      data: {
        status: "ok",
        outcome: "noop",
        override_event_id: null,
        affected_hold_session_id: null,
        affected_order_id: null,
      },
      error: null,
    });

    const result = await executeOverrideAction({
      productId: PRODUCT_ID,
      staffId: STAFF_ID,
      reason: "Segundo override na mesma peça",
    });

    expect(result).toEqual({
      ok: true,
      outcome: "noop",
      overrideEventId: null,
      affectedHoldSessionId: null,
      affectedOrderId: null,
    });
  });

  it("rejects short reason before any DB call", async () => {
    const result = await executeOverrideAction({
      productId: PRODUCT_ID,
      staffId: STAFF_ID,
      reason: "curto",
    });

    expect(result).toMatchObject({ ok: false, reason: "validation" });
    expect(from).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });
});
