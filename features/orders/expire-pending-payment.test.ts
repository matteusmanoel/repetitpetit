import { beforeEach, describe, expect, it, vi } from "vitest";

import { PENDING_PAYMENT_TTL_MINUTES } from "@/features/orders/constants";
import {
  planPendingPaymentExpire,
  planPendingPaymentExpireOutcome,
} from "@/features/orders/expire-pending-payment";

vi.mock("server-only", () => ({}));

const rpc = vi.fn();

vi.mock("@/lib/supabase/server-service", () => ({
  createServiceSupabaseClient: () => ({ rpc }),
}));

describe("PENDING_PAYMENT_TTL_MINUTES", () => {
  it("is documented as 10 minutes (issue #99 / D92)", () => {
    expect(PENDING_PAYMENT_TTL_MINUTES).toBe(10);
  });
});

describe("planPendingPaymentExpire", () => {
  const nowMs = Date.parse("2026-08-05T12:10:00.000Z");

  it("expires online pending_payment past expires_at", () => {
    expect(
      planPendingPaymentExpire({
        status: "pending_payment",
        channel: "online",
        expiresAt: "2026-08-05T12:00:00.000Z",
        nowMs,
      }),
    ).toBe("expire");
  });

  it("skips when still inside TTL window", () => {
    expect(
      planPendingPaymentExpire({
        status: "pending_payment",
        channel: "online",
        expiresAt: "2026-08-05T12:15:00.000Z",
        nowMs,
      }),
    ).toBe("skip");
  });

  it("skips store channel (POS pending_payment)", () => {
    expect(
      planPendingPaymentExpire({
        status: "pending_payment",
        channel: "store",
        expiresAt: "2026-08-05T12:00:00.000Z",
        nowMs,
      }),
    ).toBe("skip");
  });

  it("skips non-pending statuses", () => {
    expect(
      planPendingPaymentExpire({
        status: "paid",
        channel: "online",
        expiresAt: "2026-08-05T12:00:00.000Z",
        nowMs,
      }),
    ).toBe("skip");
  });

  it("skips null expires_at", () => {
    expect(
      planPendingPaymentExpire({
        status: "pending_payment",
        channel: "online",
        expiresAt: null,
        nowMs,
      }),
    ).toBe("skip");
  });
});

describe("planPendingPaymentExpireOutcome", () => {
  it("expire → order cancelled + available via SN-02; late webhook reconciles (no sold)", () => {
    expect(planPendingPaymentExpireOutcome()).toEqual({
      orderStatus: "cancelled",
      paymentStatus: "cancelled",
      eventType: "cancelled_by_payment_ttl",
      inventory: "available_via_sn02",
      lateWebhook: "reconcile_late_payment",
      ttlMinutes: 10,
    });
  });
});

describe("expireDuePendingPaymentOrders RPC contract", () => {
  beforeEach(() => {
    rpc.mockReset();
  });

  it("happy path returns expired_count and order_ids", async () => {
    rpc.mockResolvedValue({
      data: {
        status: "ok",
        expired_count: 1,
        failed_count: 0,
        order_ids: ["order-a"],
      },
      error: null,
    });

    const { expireDuePendingPaymentOrders } = await import(
      "@/features/orders/expire-pending-payment"
    );

    await expect(expireDuePendingPaymentOrders()).resolves.toEqual({
      status: "ok",
      expired_count: 1,
      failed_count: 0,
      order_ids: ["order-a"],
    });
    expect(rpc).toHaveBeenCalledWith("expire_due_pending_payment_orders");
  });

  it("empty run returns zero expired", async () => {
    rpc.mockResolvedValue({
      data: {
        status: "ok",
        expired_count: 0,
        failed_count: 0,
        order_ids: [],
      },
      error: null,
    });

    const { expireDuePendingPaymentOrders } = await import(
      "@/features/orders/expire-pending-payment"
    );

    await expect(expireDuePendingPaymentOrders()).resolves.toMatchObject({
      status: "ok",
      expired_count: 0,
    });
  });
});
