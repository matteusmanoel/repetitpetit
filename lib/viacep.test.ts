import { describe, expect, it } from "vitest";

import { normalizeCep } from "@/lib/viacep";

describe("normalizeCep", () => {
  it("aceita CEP com máscara", () => {
    expect(normalizeCep("85851-000")).toBe("85851000");
  });

  it("rejeita CEP incompleto", () => {
    expect(normalizeCep("85851")).toBeNull();
  });
});
