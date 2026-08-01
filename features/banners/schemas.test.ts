import { describe, expect, it } from "vitest";

import { bannerFormSchema } from "@/features/banners/schemas";

describe("bannerFormSchema", () => {
  it("aceita banner válido com CTA interno", () => {
    const result = bannerFormSchema.safeParse({
      title: "Novidades de inverno",
      subtitle: "Peças quentinhas",
      image_url: "https://example.com/banner.jpg",
      cta_label: "Ver catálogo",
      cta_href: "/catalogo",
      is_active: "true",
      sort_order: "1",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.cta_href).toBe("/catalogo");
      expect(result.data.is_active).toBe(true);
    }
  });

  it("permite campos opcionais vazios, mas exige imagem", () => {
    const withoutImage = bannerFormSchema.safeParse({
      title: "",
      subtitle: "",
      image_url: "",
      cta_label: "",
      cta_href: "",
      is_active: "false",
      sort_order: "0",
    });

    expect(withoutImage.success).toBe(false);

    const withImage = bannerFormSchema.safeParse({
      title: "",
      subtitle: "",
      image_url: "https://example.com/b.jpg",
      cta_label: "",
      cta_href: "",
      is_active: "false",
      sort_order: "0",
    });

    expect(withImage.success).toBe(true);
    if (withImage.success) {
      expect(withImage.data.title).toBeNull();
      expect(withImage.data.cta_href).toBeNull();
      expect(withImage.data.is_active).toBe(false);
    }
  });

  it("rejeita cta_href sem / ou http", () => {
    const result = bannerFormSchema.safeParse({
      title: "X",
      subtitle: "",
      image_url: "https://example.com/b.jpg",
      cta_label: "Ir",
      cta_href: "catalogo",
      is_active: "true",
      sort_order: "0",
    });

    expect(result.success).toBe(false);
  });
});
