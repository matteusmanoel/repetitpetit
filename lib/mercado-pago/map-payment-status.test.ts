import { describe, expect, it } from "vitest";

import {
  isOrderPastPendingPayment,
  mapMercadoPagoPaymentStatus,
} from "@/lib/mercado-pago/map-payment-status";

describe("mapMercadoPagoPaymentStatus", () => {
  it("mapeia approved → paid e authorized → authorized", () => {
    expect(mapMercadoPagoPaymentStatus("approved")).toBe("paid");
    expect(mapMercadoPagoPaymentStatus("AUTHORIZED")).toBe("authorized");
  });

  it("mantém pending/in_process/in_mediation como pending", () => {
    expect(mapMercadoPagoPaymentStatus("pending")).toBe("pending");
    expect(mapMercadoPagoPaymentStatus("in_process")).toBe("pending");
    expect(mapMercadoPagoPaymentStatus("in_mediation")).toBe("pending");
  });

  it("mapeia rejeição, cancelamento e estorno", () => {
    expect(mapMercadoPagoPaymentStatus("rejected")).toBe("failed");
    expect(mapMercadoPagoPaymentStatus("cancelled")).toBe("cancelled");
    expect(mapMercadoPagoPaymentStatus("refunded")).toBe("refunded");
    expect(mapMercadoPagoPaymentStatus("charged_back")).toBe("refunded");
  });

  it("fallback pending para status desconhecido", () => {
    expect(mapMercadoPagoPaymentStatus("something_new")).toBe("pending");
    expect(mapMercadoPagoPaymentStatus(null)).toBe("pending");
  });
});

describe("isOrderPastPendingPayment", () => {
  it("considera paid e fulfillment posteriores", () => {
    expect(isOrderPastPendingPayment("paid")).toBe(true);
    expect(isOrderPastPendingPayment("confirmed")).toBe(true);
    expect(isOrderPastPendingPayment("na_sacolinha")).toBe(true);
    expect(isOrderPastPendingPayment("completed")).toBe(true);
    expect(isOrderPastPendingPayment("pending_payment")).toBe(false);
    expect(isOrderPastPendingPayment("cancelled")).toBe(false);
    expect(isOrderPastPendingPayment("expired")).toBe(false);
  });
});
