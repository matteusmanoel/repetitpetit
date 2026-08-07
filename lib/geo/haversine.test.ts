import { describe, expect, it } from "vitest";

import { haversineKm } from "@/lib/geo/haversine";

describe("haversineKm", () => {
  it("retorna ~0 para o mesmo ponto", () => {
    const p = { latitude: -25.5344, longitude: -54.5795 };
    expect(haversineKm(p, p)).toBeCloseTo(0, 5);
  });

  it("estima distância curta em Foz do Iguaçu", () => {
    const centro = { latitude: -25.5390426, longitude: -54.5855315 };
    const argentina = { latitude: -25.5344006, longitude: -54.5794834 };
    const km = haversineKm(centro, argentina);
    expect(km).toBeGreaterThan(0.5);
    expect(km).toBeLessThan(1.5);
  });
});
