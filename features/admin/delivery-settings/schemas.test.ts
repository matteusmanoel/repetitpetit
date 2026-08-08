import { describe, expect, it } from "vitest";

import { deliverySettingsSchema } from "@/features/admin/delivery-settings/schemas";

describe("deliverySettingsSchema", () => {
  it("aceita knobs válidos e normaliza CEP", () => {
    const result = deliverySettingsSchema.safeParse({
      storePostalCode: "85851-207",
      deliveryEnabled: true,
      ratePerKm: 2.5,
      multiplier: 1,
      minAmount: 8,
      maxRadiusKm: 15,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.storePostalCode).toBe("85851207");
    }
  });

  it("rejeita multiplicador zero", () => {
    const result = deliverySettingsSchema.safeParse({
      storePostalCode: "85851207",
      deliveryEnabled: true,
      ratePerKm: 2.5,
      multiplier: 0,
      minAmount: 8,
      maxRadiusKm: 15,
    });
    expect(result.success).toBe(false);
  });
});
