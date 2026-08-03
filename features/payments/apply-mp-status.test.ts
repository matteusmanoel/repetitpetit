import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const maybeSingle = vi.fn();
const eq = vi.fn(() => ({ maybeSingle, eq: vi.fn(() => ({ maybeSingle })) }));
const select = vi.fn(() => ({ eq }));
const update = vi.fn(() => ({ eq }));
const insert = vi.fn();
const from = vi.fn(() => ({ select, update, insert }));

vi.mock("@/lib/supabase/server-service", () => ({
  createServiceSupabaseClient: () => ({ from }),
}));

const markProductsSoldForOrder = vi.fn();
vi.mock("@/features/inventory/apply-transition", () => ({
  markProductsSoldForOrder: (...args: unknown[]) =>
    markProductsSoldForOrder(...args),
}));

vi.mock("@/features/cart/hold-session", () => ({
  convertHoldSession: vi.fn(),
}));

const reconcileLatePayment = vi.fn();
vi.mock("@/features/payments/reconcile-late-payment", () => ({
  reconcileLatePayment: (...args: unknown[]) => reconcileLatePayment(...args),
}));

import { applyMercadoPagoPaymentStatus } from "@/features/payments/apply-mp-status";
import type { MercadoPagoPayment } from "@/lib/mercado-pago/fetch-payment";

function payment(
  overrides: Partial<MercadoPagoPayment> = {},
): MercadoPagoPayment {
  return {
    id: "mp-1",
    status: "approved",
    statusDetail: "accredited",
    externalReference: "RP-TEST-1",
    transactionAmount: 50,
    dateApproved: "2026-08-03T12:00:00.000Z",
    preferenceId: "pref-1",
    metadata: { order_id: "ord-1" },
    raw: { id: 1, status: "approved" },
    ...overrides,
  };
}

describe("applyMercadoPagoPaymentStatus (SN-06)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    maybeSingle.mockReset();
    markProductsSoldForOrder.mockReset();
    reconcileLatePayment.mockReset();
    from.mockReset();
    from.mockImplementation(() => ({ select, update, insert }));
    select.mockImplementation(() => ({ eq }));
    update.mockImplementation(() => ({ eq }));
    eq.mockImplementation(() => ({
      maybeSingle,
      eq: vi.fn(() => ({ maybeSingle, select: vi.fn(() => ({ maybeSingle })) })),
      select: vi.fn(() => ({ maybeSingle })),
    }));
  });

  it("cancelled + approved → reconciled_after_override; never marks sold", async () => {
    maybeSingle.mockResolvedValueOnce({
      data: {
        id: "ord-1",
        public_code: "RP-TEST-1",
        status: "cancelled",
        payment_status: "pending",
        mp_payment_id: null,
        paid_at: null,
      },
      error: null,
    });

    reconcileLatePayment.mockResolvedValueOnce({
      ok: true,
      outcome: "reconciled_after_override",
      orderId: "ord-1",
      publicCode: "RP-TEST-1",
      refundStubbed: true,
    });

    const result = await applyMercadoPagoPaymentStatus(payment());

    expect(result).toEqual({
      ok: true,
      outcome: "reconciled_after_override",
      orderId: "ord-1",
      publicCode: "RP-TEST-1",
      paymentStatus: "cancelled",
      orderStatus: "cancelled",
    });
    expect(reconcileLatePayment).toHaveBeenCalledTimes(1);
    expect(markProductsSoldForOrder).not.toHaveBeenCalled();
  });

  it("paid + approved (double webhook) → already_paid idempotent", async () => {
    from.mockImplementation((table: string) => {
      if (table === "orders") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () =>
                Promise.resolve({
                  data: {
                    id: "ord-1",
                    public_code: "RP-TEST-1",
                    status: "paid",
                    payment_status: "paid",
                    mp_payment_id: "mp-1",
                    paid_at: "2026-08-03T12:00:00.000Z",
                    pricing_snapshot_json: null,
                  },
                  error: null,
                }),
            }),
          }),
          update: () => ({
            eq: () => Promise.resolve({ error: null }),
          }),
        };
      }
      if (table === "order_items") {
        return {
          select: () => ({
            eq: () =>
              Promise.resolve({
                data: [{ product_id: "prod-1" }],
                error: null,
              }),
          }),
        };
      }
      if (table === "hold_sessions") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () =>
                Promise.resolve({ data: null, error: null }),
            }),
          }),
        };
      }
      return { select, update, insert };
    });

    markProductsSoldForOrder.mockResolvedValue({ ok: true });

    const result = await applyMercadoPagoPaymentStatus(payment());

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.outcome).toBe("already_paid");
    }
    expect(reconcileLatePayment).not.toHaveBeenCalled();
    expect(markProductsSoldForOrder).toHaveBeenCalled();
  });

  it("cancelled already reconciled → noop (double late webhook)", async () => {
    maybeSingle.mockResolvedValueOnce({
      data: {
        id: "ord-1",
        public_code: "RP-TEST-1",
        status: "cancelled",
        payment_status: "cancelled",
        mp_payment_id: "mp-1",
        paid_at: null,
      },
      error: null,
    });

    reconcileLatePayment.mockResolvedValueOnce({
      ok: true,
      outcome: "noop",
      orderId: "ord-1",
      publicCode: "RP-TEST-1",
      refundStubbed: true,
    });

    const result = await applyMercadoPagoPaymentStatus(payment());

    expect(result).toMatchObject({
      ok: true,
      outcome: "noop",
      orderStatus: "cancelled",
    });
    expect(markProductsSoldForOrder).not.toHaveBeenCalled();
  });
});
