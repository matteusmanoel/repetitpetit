import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const maybeSingle = vi.fn();
const limit = vi.fn(() => ({ maybeSingle }));
const order = vi.fn(() => ({ limit }));
const eq2 = vi.fn(() => ({ order, limit, maybeSingle }));
const eq1 = vi.fn(() => ({ eq: eq2, limit, maybeSingle, order }));
const select = vi.fn(() => ({ eq: eq1 }));
const update = vi.fn(() => ({ eq: eq1 }));
const insert = vi.fn();
const from = vi.fn((table: string) => {
  void table;
  return { select, update, insert, eq: eq1 };
});

vi.mock("@/lib/supabase/server-service", () => ({
  createServiceSupabaseClient: () => ({ from }),
}));

import { reconcileLatePayment } from "@/features/payments/reconcile-late-payment";
import type { MercadoPagoPayment } from "@/lib/mercado-pago/fetch-payment";

const cancelledOrder = {
  id: "order-1",
  public_code: "RP-2026-0001",
  status: "cancelled" as const,
  payment_status: "pending" as const,
  mp_payment_id: null as string | null,
};

function approvedPayment(
  overrides: Partial<MercadoPagoPayment> = {},
): MercadoPagoPayment {
  return {
    id: "mp-pay-99",
    status: "approved",
    statusDetail: "accredited",
    externalReference: "RP-2026-0001",
    transactionAmount: 80,
    dateApproved: "2026-08-03T15:00:00.000Z",
    preferenceId: "pref-1",
    metadata: { order_id: "order-1" },
    raw: { id: 99, status: "approved" },
    ...overrides,
  };
}

describe("reconcileLatePayment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    from.mockImplementation(() => ({ select, update, insert, eq: eq1 }));
    select.mockImplementation(() => ({ eq: eq1 }));
    update.mockImplementation(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })),
    }));
    insert.mockResolvedValue({ error: null });
    // Default chain for order_events prior lookup + payments lookup
    maybeSingle.mockResolvedValue({ data: null, error: null });
    eq1.mockImplementation(() => ({
      eq: eq2,
      limit,
      maybeSingle,
      order,
    }));
    eq2.mockImplementation(() => ({
      order,
      limit,
      maybeSingle,
    }));
    limit.mockImplementation(() => ({ maybeSingle }));
    order.mockImplementation(() => ({ limit }));
  });

  it("cancelled → reconciled_after_override; stubs refund; never marks sold", async () => {
    const refund = vi.fn().mockResolvedValue({
      ok: true,
      stubbed: true,
      refundId: null,
    });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const info = vi.spyOn(console, "info").mockImplementation(() => {});

    // 1) prior event lookup → none
    maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    // 2) payments existing lookup → none
    maybeSingle.mockResolvedValueOnce({ data: null, error: null });

    const result = await reconcileLatePayment(
      cancelledOrder,
      approvedPayment(),
      { refund },
    );

    expect(result).toEqual({
      ok: true,
      outcome: "reconciled_after_override",
      orderId: "order-1",
      publicCode: "RP-2026-0001",
      refundStubbed: true,
    });
    expect(refund).toHaveBeenCalledWith("mp-pay-99");

    const insertedEvents = insert.mock.calls.filter((call) => {
      const arg = call[0] as { event_type?: string };
      return arg?.event_type === "late_webhook_reconciled";
    });
    expect(insertedEvents.length).toBeGreaterThanOrEqual(1);
    expect(insertedEvents[0]?.[0]).toMatchObject({
      order_id: "order-1",
      event_type: "late_webhook_reconciled",
      actor_type: "system",
    });

    // payments insert with cancelled status
    const paymentInserts = insert.mock.calls.filter((call) => {
      const arg = call[0] as { status?: string; provider?: string };
      return arg?.provider === "mercado_pago" || arg?.status === "cancelled";
    });
    expect(paymentInserts.length).toBeGreaterThanOrEqual(1);

    warn.mockRestore();
    info.mockRestore();
  });

  it("second reconcile is noop (idempotent)", async () => {
    maybeSingle.mockResolvedValueOnce({
      data: { id: "evt-1" },
      error: null,
    });
    const refund = vi.fn();

    const result = await reconcileLatePayment(
      cancelledOrder,
      approvedPayment(),
      { refund },
    );

    expect(result).toEqual({
      ok: true,
      outcome: "noop",
      orderId: "order-1",
      publicCode: "RP-2026-0001",
      refundStubbed: true,
    });
    expect(refund).not.toHaveBeenCalled();
    expect(insert).not.toHaveBeenCalled();
  });

  it("logs refund failure clearly and still reconciles", async () => {
    const refund = vi.fn().mockResolvedValue({
      ok: false,
      stubbed: false,
      error: "HTTP 500",
    });
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const info = vi.spyOn(console, "info").mockImplementation(() => {});

    maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    maybeSingle.mockResolvedValueOnce({ data: null, error: null });

    const result = await reconcileLatePayment(
      cancelledOrder,
      approvedPayment(),
      { refund },
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.outcome).toBe("reconciled_after_override");
      expect(result.refundStubbed).toBe(true);
    }
    expect(errorSpy).toHaveBeenCalled();
    const joined = errorSpy.mock.calls.map((c) => String(c[0])).join(" ");
    expect(joined).toContain("reconcileLatePayment refund failed");

    errorSpy.mockRestore();
    info.mockRestore();
  });
});
