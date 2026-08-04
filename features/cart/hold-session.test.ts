import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const rpc = vi.fn();
const from = vi.fn();

vi.mock("@/lib/supabase/server-service", () => ({
  createServiceSupabaseClient: () => ({ rpc, from }),
}));

import {
  convertHoldSession,
  getHoldSession,
  releaseHoldItem,
  releaseHoldSession,
  reserveHoldItem,
} from "@/features/cart/hold-session";

describe("reserveHoldItem", () => {
  beforeEach(() => {
    rpc.mockReset();
    from.mockReset();
  });

  it("maps ok payload", async () => {
    rpc.mockResolvedValue({
      data: {
        status: "ok",
        hold_session_id: "hs-1",
        expires_at: "2026-08-03T15:00:00.000Z",
      },
      error: null,
    });

    await expect(reserveHoldItem("sess-a", "prod-1")).resolves.toEqual({
      status: "ok",
      holdSessionId: "hs-1",
      expiresAt: "2026-08-03T15:00:00.000Z",
    });
    expect(rpc).toHaveBeenCalledWith("reserve_hold_item", {
      p_session_id: "sess-a",
      p_product_id: "prod-1",
    });
  });

  it("maps unavailable and limit_reached", async () => {
    rpc.mockResolvedValueOnce({
      data: { status: "unavailable" },
      error: null,
    });
    await expect(reserveHoldItem("sess-a", "prod-1")).resolves.toEqual({
      status: "unavailable",
    });

    rpc.mockResolvedValueOnce({
      data: { status: "limit_reached" },
      error: null,
    });
    await expect(reserveHoldItem("sess-a", "prod-1")).resolves.toEqual({
      status: "limit_reached",
    });
  });
});

describe("releaseHoldItem / releaseHoldSession / convertHoldSession", () => {
  beforeEach(() => {
    rpc.mockReset();
  });

  it("maps release_hold_item ok and not_found", async () => {
    rpc.mockResolvedValueOnce({
      data: {
        status: "ok",
        hold_session_id: "hs-1",
        product_id: "prod-1",
      },
      error: null,
    });
    await expect(releaseHoldItem("sess-a", "prod-1")).resolves.toEqual({
      status: "ok",
      holdSessionId: "hs-1",
      productId: "prod-1",
    });

    rpc.mockResolvedValueOnce({
      data: { status: "not_found" },
      error: null,
    });
    await expect(releaseHoldItem("sess-a", "prod-1")).resolves.toEqual({
      status: "not_found",
    });
  });

  it("maps release_hold_session with expired final status", async () => {
    rpc.mockResolvedValue({
      data: {
        status: "ok",
        hold_session_id: "hs-1",
        final_status: "expired",
      },
      error: null,
    });

    await expect(releaseHoldSession("sess-a", "expired")).resolves.toEqual({
      status: "ok",
      holdSessionId: "hs-1",
      finalStatus: "expired",
    });
    expect(rpc).toHaveBeenCalledWith("release_hold_session", {
      p_session_id: "sess-a",
      p_final_status: "expired",
    });
  });

  it("maps convert_hold_session without implying sold", async () => {
    rpc.mockResolvedValue({
      data: {
        status: "ok",
        hold_session_id: "hs-1",
        order_id: "ord-1",
      },
      error: null,
    });

    await expect(convertHoldSession("sess-a", "ord-1")).resolves.toEqual({
      status: "ok",
      holdSessionId: "hs-1",
      orderId: "ord-1",
    });
  });
});

describe("getHoldSession", () => {
  beforeEach(() => {
    from.mockReset();
  });

  it("returns null when no active session", async () => {
    from.mockReturnValueOnce({
      select: () => ({
        eq: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: null, error: null }),
          }),
        }),
      }),
    });

    await expect(getHoldSession("sess-a")).resolves.toBeNull();
  });
});
