import { describe, expect, it } from "vitest";

import { buildFreteSnapshot, quoteFrete, roundBrl } from "@/features/checkout/frete";

const knobs = {
  ratePerKm: 2.5,
  multiplier: 1,
  minAmount: 8,
  maxRadiusKm: 15,
};

describe("quoteFrete", () => {
  it("aplica mínimo quando km × taxa é baixo", () => {
    const quote = quoteFrete(1, knobs);
    expect(quote.ok).toBe(true);
    if (quote.ok) {
      expect(quote.amount).toBe(8);
      expect(quote.distanceKm).toBe(1);
    }
  });

  it("calcula km × taxa × multiplicador acima do mínimo", () => {
    const quote = quoteFrete(10, { ...knobs, multiplier: 1.2 });
    expect(quote.ok).toBe(true);
    if (quote.ok) {
      // 10 * 2.5 * 1.2 = 30
      expect(quote.amount).toBe(30);
    }
  });

  it("marca fora do raio", () => {
    const quote = quoteFrete(20, knobs);
    expect(quote.ok).toBe(false);
    if (!quote.ok) {
      expect(quote.reason).toBe("out_of_radius");
      expect(quote.maxRadiusKm).toBe(15);
    }
  });
});

describe("roundBrl", () => {
  it("arredonda para 2 casas", () => {
    expect(roundBrl(8.456)).toBe(8.46);
    expect(roundBrl(8.454)).toBe(8.45);
  });
});

describe("buildFreteSnapshot", () => {
  it("monta snapshot haversine", () => {
    const quote = quoteFrete(4, knobs);
    expect(quote.ok).toBe(true);
    if (!quote.ok) return;
    const snap = buildFreteSnapshot({
      customerPostalCode: "85851000",
      storePostalCode: "85851207",
      quote,
    });
    expect(snap.method).toBe("haversine");
    expect(snap.amount).toBe(quote.amount);
    expect(snap.customer_postal_code).toBe("85851000");
  });
});
