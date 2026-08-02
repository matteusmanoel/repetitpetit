import { describe, expect, it } from "vitest";

import { createOrderSchema } from "@/features/checkout/schemas";

const base = {
  fullName: "Maria Silva",
  phone: "45999999999",
  productIds: ["11111111-1111-4111-8111-111111111111"],
};

describe("createOrderSchema", () => {
  it("aceita retirada sem endereço", () => {
    const result = createOrderSchema.safeParse({
      ...base,
      fulfillmentType: "pickup",
    });
    expect(result.success).toBe(true);
  });

  it("exige endereço na entrega", () => {
    const result = createOrderSchema.safeParse({
      ...base,
      fulfillmentType: "delivery",
    });
    expect(result.success).toBe(false);
  });

  it("aceita entrega com endereço completo", () => {
    const result = createOrderSchema.safeParse({
      ...base,
      email: "",
      fulfillmentType: "delivery",
      address: {
        recipientName: "Maria Silva",
        street: "Av. Brasil",
        number: "100",
        neighborhood: "Centro",
        city: "Foz do Iguaçu",
        state: "pr",
        postalCode: "85851-000",
      },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.address?.state).toBe("PR");
      expect(result.data.address?.postalCode).toBe("85851000");
      expect(result.data.email).toBeUndefined();
    }
  });

  it("normaliza telefone removendo máscara", () => {
    const result = createOrderSchema.safeParse({
      ...base,
      phone: "(45) 99999-9999",
      fulfillmentType: "pickup",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.phone).toBe("45999999999");
    }
  });
});
