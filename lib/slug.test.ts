import { describe, expect, it } from "vitest";

import { slugify } from "@/lib/slug";

describe("slugify", () => {
  it("converte texto com acentos e espaços", () => {
    expect(slugify("Roupas de Bebê")).toBe("roupas-de-bebe");
  });

  it("remove caracteres especiais e colapsa hífens", () => {
    expect(slugify("  Meninas — 4/5 anos!! ")).toBe("meninas-4-5-anos");
  });

  it("retorna string vazia para input só com símbolos", () => {
    expect(slugify("!!!")).toBe("");
  });
});
