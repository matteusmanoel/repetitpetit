import { describe, expect, it } from "vitest";

import {
  isOrderPastPendingPayment,
  mapMercadoPagoPaymentStatus,
} from "@/lib/mercado-pago/map-payment-status";

/**
 * Plano de transição puro (espelha a política de apply-mp-status.ts)
 * — testável sem Supabase / server-only.
 */
function planApply(input: {
  orderStatus: Parameters<typeof isOrderPastPendingPayment>[0];
  paymentStatus: ReturnType<typeof mapMercadoPagoPaymentStatus>;
  mpStatus: string;
}): "applied_paid" | "already_paid" | "payment_updated" | "noop" {
  const mapped = mapMercadoPagoPaymentStatus(input.mpStatus);

  if (mapped === "paid" && isOrderPastPendingPayment(input.orderStatus)) {
    return "already_paid";
  }

  if (mapped === "paid" && input.orderStatus === "pending_payment") {
    return "applied_paid";
  }

  if (input.paymentStatus === mapped) {
    return "noop";
  }

  return "payment_updated";
}

describe("apply-mp-status transition plan", () => {
  it("pending_payment + approved → applied_paid", () => {
    expect(
      planApply({
        orderStatus: "pending_payment",
        paymentStatus: "pending",
        mpStatus: "approved",
      }),
    ).toBe("applied_paid");
  });

  it("paid + approved → already_paid (idempotente)", () => {
    expect(
      planApply({
        orderStatus: "paid",
        paymentStatus: "paid",
        mpStatus: "approved",
      }),
    ).toBe("already_paid");
  });

  it("confirmed + approved → already_paid", () => {
    expect(
      planApply({
        orderStatus: "confirmed",
        paymentStatus: "paid",
        mpStatus: "approved",
      }),
    ).toBe("already_paid");
  });

  it("pending_payment + rejected → payment_updated", () => {
    expect(
      planApply({
        orderStatus: "pending_payment",
        paymentStatus: "pending",
        mpStatus: "rejected",
      }),
    ).toBe("payment_updated");
  });

  it("pending_payment + pending → noop", () => {
    expect(
      planApply({
        orderStatus: "pending_payment",
        paymentStatus: "pending",
        mpStatus: "pending",
      }),
    ).toBe("noop");
  });
});
