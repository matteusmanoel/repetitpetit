import { describe, expect, it } from "vitest";

import { intakeRequestSchema } from "@/features/intake/schemas";

describe("intakeRequestSchema", () => {
  it("aceita payload válido com e-mail opcional vazio", () => {
    const parsed = intakeRequestSchema.safeParse({
      fullName: "Ana Silva",
      phone: "45999999999",
      email: "",
      itemCount: "5",
      description: "Roupas de inverno tamanho 2 anos.",
      preferredMethod: "entrega_na_loja",
      photoUrls: [],
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.email).toBeUndefined();
      expect(parsed.data.itemCount).toBe(5);
    }
  });

  it("rejeita telefone inválido e mais de 5 fotos", () => {
    const parsed = intakeRequestSchema.safeParse({
      fullName: "Ana",
      phone: "123",
      itemCount: 2,
      description: "Descrição válida das peças.",
      preferredMethod: "envio_pelos_correios",
      photoUrls: [
        "https://example.com/1.jpg",
        "https://example.com/2.jpg",
        "https://example.com/3.jpg",
        "https://example.com/4.jpg",
        "https://example.com/5.jpg",
        "https://example.com/6.jpg",
      ],
    });

    expect(parsed.success).toBe(false);
  });
});
