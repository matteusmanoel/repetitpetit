import { describe, expect, it } from "vitest";

import { mergeRelatedProducts } from "@/features/catalog/related-products";
import type { CatalogProduct } from "@/features/catalog/types";

function stub(id: string): CatalogProduct {
  return {
    id,
    name: id,
    slug: id,
    price: 10,
    compare_at_price: null,
    cover_image_url: null,
    quantity: 1,
    brand: "GAP",
    size_label: "2a",
    created_at: "2026-01-01T00:00:00Z",
    gender: "menina",
    condition: "seminovo",
    status: "available",
  };
}

describe("mergeRelatedProducts", () => {
  it("prioriza a lista primary e completa com fallback", () => {
    const primary = [stub("a"), stub("b")];
    const fallback = [stub("b"), stub("c"), stub("d")];
    expect(mergeRelatedProducts("self", 3, primary, fallback).map((p) => p.id)).toEqual([
      "a",
      "b",
      "c",
    ]);
  });

  it("exclui o produto atual", () => {
    expect(
      mergeRelatedProducts("self", 5, [stub("self"), stub("x")]).map((p) => p.id),
    ).toEqual(["x"]);
  });

  it("respeita o limite", () => {
    expect(
      mergeRelatedProducts("z", 2, [stub("a"), stub("b"), stub("c")]).map((p) => p.id),
    ).toEqual(["a", "b"]);
  });
});
