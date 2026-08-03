import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const rpc = vi.fn();
const maybeSingle = vi.fn();
const eq = vi.fn(() => ({ maybeSingle }));
const select = vi.fn(() => ({ eq }));
const from = vi.fn(() => ({ select }));

vi.mock("@/lib/supabase/server-service", () => ({
  createServiceSupabaseClient: () => ({ rpc, from }),
}));

const reserveHoldItem = vi.fn();
const releaseHoldItem = vi.fn();
const releaseHoldSession = vi.fn();

vi.mock("@/features/cart/hold-session", () => ({
  reserveHoldItem: (...args: unknown[]) => reserveHoldItem(...args),
  releaseHoldItem: (...args: unknown[]) => releaseHoldItem(...args),
  releaseHoldSession: (...args: unknown[]) => releaseHoldSession(...args),
}));

import {
  applyInventoryTransition,
  markProductsSoldForOrder,
} from "@/features/inventory/apply-transition";

describe("applyInventoryTransition", () => {
  beforeEach(() => {
    rpc.mockReset();
    from.mockReset();
    select.mockClear();
    eq.mockClear();
    maybeSingle.mockReset();
    reserveHoldItem.mockReset();
    releaseHoldItem.mockReset();
    releaseHoldSession.mockReset();
    from.mockImplementation(() => ({ select }));
  });

  it("delegates available → hold to SN-02 reserve", async () => {
    maybeSingle.mockResolvedValueOnce({
      data: { id: "p1", status: "available" },
      error: null,
    });
    reserveHoldItem.mockResolvedValueOnce({
      status: "ok",
      holdSessionId: "hs-1",
      expiresAt: "2026-08-03T15:00:00.000Z",
    });

    await expect(
      applyInventoryTransition("p1", {
        from: "available",
        to: "hold",
        context: { holdSessionId: "cookie-1" },
      }),
    ).resolves.toEqual({ ok: true, outcome: "sn02" });

    expect(reserveHoldItem).toHaveBeenCalledWith("cookie-1", "p1");
    expect(rpc).not.toHaveBeenCalled();
  });

  it("applies hold → sold via inventory RPC", async () => {
    maybeSingle
      .mockResolvedValueOnce({
        data: { id: "p1", status: "hold" },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { hold_session_id: "hs-aaa" },
        error: null,
      });

    rpc.mockResolvedValueOnce({
      data: { status: "ok", outcome: "applied" },
      error: null,
    });

    await expect(
      applyInventoryTransition("p1", {
        from: "hold",
        to: "sold",
        context: {
          orderId: "o1",
          channel: "online",
          holdSessionId: "hs-aaa",
        },
      }),
    ).resolves.toEqual({ ok: true, outcome: "applied" });

    expect(rpc).toHaveBeenCalledWith("apply_inventory_transition", {
      p_product_id: "p1",
      p_from: "hold",
      p_to: "sold",
      p_sold_channel: "online",
      p_hold_session_id: "hs-aaa",
      p_order_id: "o1",
    });
  });

  it("returns already_sold when product is sold and target is sold", async () => {
    maybeSingle.mockResolvedValueOnce({
      data: { id: "p1", status: "sold" },
      error: null,
    });

    await expect(
      applyInventoryTransition("p1", {
        from: "available",
        to: "sold",
        context: { orderId: "o1", channel: "online" },
      }),
    ).resolves.toEqual({ ok: true, outcome: "already_sold" });

    expect(rpc).not.toHaveBeenCalled();
  });

  it("rejects wrong from without calling RPC", async () => {
    maybeSingle.mockResolvedValueOnce({
      data: { id: "p1", status: "inactive" },
      error: null,
    });

    await expect(
      applyInventoryTransition("p1", {
        from: "available",
        to: "sold",
        context: { orderId: "o1", channel: "store" },
      }),
    ).resolves.toEqual({ ok: false, reason: "wrong_from" });
  });
});

describe("markProductsSoldForOrder", () => {
  beforeEach(() => {
    rpc.mockReset();
    from.mockReset();
    maybeSingle.mockReset();
    from.mockImplementation(() => ({ select }));
  });

  it("marks available product sold with store channel", async () => {
    maybeSingle
      .mockResolvedValueOnce({
        data: { id: "p1", status: "available" },
        error: null,
      })
      // applyInventoryTransition load
      .mockResolvedValueOnce({
        data: { id: "p1", status: "available" },
        error: null,
      });

    rpc.mockResolvedValueOnce({
      data: { status: "ok", outcome: "applied" },
      error: null,
    });

    await expect(
      markProductsSoldForOrder({
        orderId: "o1",
        productIds: ["p1"],
        channel: "store",
      }),
    ).resolves.toEqual({ ok: true, outcome: "applied" });
  });
});
