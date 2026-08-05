import type { CatalogProduct } from "@/features/catalog/types";

/**
 * Une listas de candidatos a relacionados sem duplicar, até `limit`.
 * Ordem: primary primeiro, depois cada fallback na ordem dada.
 */
export function mergeRelatedProducts(
  excludeProductId: string,
  limit: number,
  ...lists: CatalogProduct[][]
): CatalogProduct[] {
  const seen = new Set<string>([excludeProductId]);
  const out: CatalogProduct[] = [];

  for (const list of lists) {
    for (const product of list) {
      if (seen.has(product.id)) continue;
      seen.add(product.id);
      out.push(product);
      if (out.length >= limit) return out;
    }
  }

  return out;
}
