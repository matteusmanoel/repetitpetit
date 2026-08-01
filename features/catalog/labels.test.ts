import { describe, expect, it } from "vitest";

import { conditionLabel, genderLabel } from "@/features/catalog/labels";

describe("catalog labels", () => {
  it("maps condition and gender to pt-BR", () => {
    expect(conditionLabel("seminovo")).toBe("Seminovo");
    expect(conditionLabel("bom_estado")).toBe("Bom estado");
    expect(genderLabel("menina")).toBe("Menina");
    expect(genderLabel("unissex")).toBe("Unissex");
  });
});
