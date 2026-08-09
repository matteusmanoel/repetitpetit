import { describe, expect, it } from "vitest";

import {
  PRODUCT_SIZE_LABELS,
  coerceProductSizeLabel,
  isProductSizeLabel,
} from "@/features/admin/product-constants";

describe("PRODUCT_SIZE_LABELS (D135)", () => {
  it("includes RN before P/M/G", () => {
    expect(PRODUCT_SIZE_LABELS).toEqual(["RN", "P", "M", "G"]);
  });

  it("isProductSizeLabel accepts only the four ops labels", () => {
    expect(isProductSizeLabel("RN")).toBe(true);
    expect(isProductSizeLabel("P")).toBe(true);
    expect(isProductSizeLabel("2 anos")).toBe(false);
  });
});

describe("coerceProductSizeLabel", () => {
  it("passes through RN|P|M|G", () => {
    expect(coerceProductSizeLabel("RN")).toBe("RN");
    expect(coerceProductSizeLabel("P")).toBe("P");
    expect(coerceProductSizeLabel("M")).toBe("M");
    expect(coerceProductSizeLabel("G")).toBe("G");
  });

  it("maps RN aliases", () => {
    expect(coerceProductSizeLabel("rn")).toBe("RN");
    expect(coerceProductSizeLabel("Recém-nascido")).toBe("RN");
    expect(coerceProductSizeLabel("newborn")).toBe("RN");
  });

  it("maps word aliases for P/M/G", () => {
    expect(coerceProductSizeLabel("pequeno")).toBe("P");
    expect(coerceProductSizeLabel("médio")).toBe("M");
    expect(coerceProductSizeLabel("grande")).toBe("G");
  });

  it("falls back to M for empty or unknown legado", () => {
    expect(coerceProductSizeLabel(null)).toBe("M");
    expect(coerceProductSizeLabel("")).toBe("M");
    expect(coerceProductSizeLabel("2 anos")).toBe("M");
    expect(coerceProductSizeLabel("12-18m")).toBe("M");
  });
});
