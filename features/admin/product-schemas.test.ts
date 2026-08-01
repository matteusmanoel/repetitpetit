import { describe, expect, it } from "vitest";

import { slugifyProductName } from "@/features/admin/product-constants";
import {
  parseProductFormData,
  productFormSchema,
} from "@/features/admin/product-schemas";

describe("slugifyProductName", () => {
  it("remove acentos e espaços", () => {
    expect(slugifyProductName("Casacão Moletom GAP")).toBe("casacao-moletom-gap");
  });
});

describe("productFormSchema", () => {
  const base = {
    name: "Casaco azul",
    slug: "casaco-azul",
    description: "Lindo",
    price: "49.90",
    compare_at_price: "",
    brand: "GAP",
    size_label: "2 anos",
    size_group: "2_3a",
    gender: "unissex",
    condition: "seminovo",
    status: "available",
    quantity: "1",
    is_featured: "on",
    tags: "inverno, casaco",
    category_id: "",
    images: [
      {
        image_url: "https://example.com/foto.jpg",
        alt_text: null,
      },
    ],
  };

  it("aceita peça única com campos do data model", () => {
    const parsed = productFormSchema.safeParse(base);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.quantity).toBe(1);
    expect(parsed.data.tags).toEqual(["inverno", "casaco"]);
    expect(parsed.data.category_id).toBeNull();
    expect(parsed.data.compare_at_price).toBeNull();
    expect(parsed.data.is_featured).toBe(true);
  });

  it("rejeita preço zero", () => {
    const parsed = productFormSchema.safeParse({ ...base, price: "0" });
    expect(parsed.success).toBe(false);
  });

  it("parseProductFormData lê images JSON do FormData", () => {
    const formData = new FormData();
    for (const [key, value] of Object.entries(base)) {
      if (key === "images") {
        formData.set("images", JSON.stringify(value));
      } else {
        formData.set(key, String(value));
      }
    }

    const result = parseProductFormData(formData);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.images).toHaveLength(1);
    expect(result.data.size_group).toBe("2_3a");
  });
});
