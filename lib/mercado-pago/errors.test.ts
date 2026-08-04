import { describe, expect, it } from "vitest";

import {
  isMercadoPagoPaymentNotFoundError,
  MercadoPagoPaymentNotFoundError,
} from "@/lib/mercado-pago/errors";

describe("MercadoPagoPaymentNotFoundError", () => {
  it("is identifiable via type guard", () => {
    const error = new MercadoPagoPaymentNotFoundError("123456");
    expect(isMercadoPagoPaymentNotFoundError(error)).toBe(true);
    expect(isMercadoPagoPaymentNotFoundError(new Error("other"))).toBe(false);
    expect(error.paymentId).toBe("123456");
  });
});
