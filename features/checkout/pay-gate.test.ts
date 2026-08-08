import { describe, expect, it } from "vitest";

import { isCheckoutPayEnabled } from "@/features/checkout/pay-gate";

describe("isCheckoutPayEnabled", () => {
  it("habilita pagar no path Sacolinha (pickup)", () => {
    expect(isCheckoutPayEnabled("pickup")).toBe(true);
  });

  it("bloqueia entrega sem frete calculado (D104 / #127)", () => {
    expect(isCheckoutPayEnabled("delivery")).toBe(false);
    expect(isCheckoutPayEnabled("delivery", { deliveryFreteReady: false })).toBe(
      false,
    );
  });

  it("habilita entrega quando frete haversine OK", () => {
    expect(isCheckoutPayEnabled("delivery", { deliveryFreteReady: true })).toBe(
      true,
    );
  });

  it("bloqueia sem fulfillment selecionado", () => {
    expect(isCheckoutPayEnabled("")).toBe(false);
  });
});
