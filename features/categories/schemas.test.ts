import { describe, expect, it } from "vitest";

import { categoryFormSchema } from "@/features/categories/schemas";

describe("categoryFormSchema", () => {
  it("aceita categoria válida completa", () => {
    const result = categoryFormSchema.safeParse({
      name: "Roupas de Bebê",
      slug: "roupas-de-bebe",
      description: "Peças para RN a 18 meses",
      image_url: "https://example.com/cat.jpg",
      is_active: "true",
      sort_order: "10",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.is_active).toBe(true);
      expect(result.data.sort_order).toBe(10);
      expect(result.data.image_url).toBe("https://example.com/cat.jpg");
    }
  });

  it("normaliza image_url e description vazios para null", () => {
    const result = categoryFormSchema.safeParse({
      name: "Meninas",
      slug: "meninas",
      description: "  ",
      image_url: "",
      is_active: false,
      sort_order: 0,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.description).toBeNull();
      expect(result.data.image_url).toBeNull();
      expect(result.data.is_active).toBe(false);
    }
  });

  it("rejeita slug inválido", () => {
    const result = categoryFormSchema.safeParse({
      name: "Teste",
      slug: "Slug Com Espaço",
      description: "",
      image_url: "",
      is_active: "true",
      sort_order: "0",
    });

    expect(result.success).toBe(false);
  });

  it("rejeita nome vazio", () => {
    const result = categoryFormSchema.safeParse({
      name: "   ",
      slug: "teste",
      description: "",
      image_url: "",
      is_active: "true",
      sort_order: "0",
    });

    expect(result.success).toBe(false);
  });
});
