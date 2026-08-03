import { describe, expect, it } from "vitest";

import { createOrderSchema } from "@/features/checkout/schemas";

const holdSessionId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

const base = {
  fullName: "Maria Silva",
  phone: "45999999999",
  email: "maria@exemplo.com",
  holdSessionId,
};

describe("createOrderSchema", () => {
  it("aceita retirada sem endereço", () => {
    const result = createOrderSchema.safeParse({
      ...base,
      fulfillmentType: "pickup",
    });
    expect(result.success).toBe(true);
  });

  it("exige holdSessionId", () => {
    const result = createOrderSchema.safeParse({
      fullName: base.fullName,
      phone: base.phone,
      email: base.email,
      fulfillmentType: "pickup",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((issue) =>
          issue.path.includes("holdSessionId"),
        ),
      ).toBe(true);
    }
  });

  it("exige e-mail no checkout", () => {
    const result = createOrderSchema.safeParse({
      fullName: base.fullName,
      phone: base.phone,
      email: "",
      holdSessionId,
      fulfillmentType: "pickup",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((issue) => issue.path.includes("email")),
      ).toBe(true);
    }
  });

  it("rejeita e-mail inválido", () => {
    const result = createOrderSchema.safeParse({
      ...base,
      email: "nao-e-email",
      fulfillmentType: "pickup",
    });
    expect(result.success).toBe(false);
  });

  it("normaliza e-mail para minúsculas", () => {
    const result = createOrderSchema.safeParse({
      ...base,
      email: "Maria@Exemplo.COM",
      fulfillmentType: "pickup",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("maria@exemplo.com");
    }
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
      expect(result.data.email).toBe("maria@exemplo.com");
      expect(result.data.holdSessionId).toBe(holdSessionId);
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
