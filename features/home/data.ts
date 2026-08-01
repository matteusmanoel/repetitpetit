import "server-only";

import { listActiveBanners, type ActiveBanner } from "@/features/banners/data";
import {
  listActiveCategories,
  type ActiveCategory,
} from "@/features/categories/data";
import { getLatestAvailableProducts } from "@/features/catalog/data";
import type { CatalogProduct } from "@/features/catalog/types";

export type { ActiveBanner as HomeBanner, ActiveCategory as HomeCategory };

const LATEST_PRODUCTS_LIMIT = 8;

/**
 * Dados da home pública — banners ativos, categorias ativas e
 * últimas novidades. Usa o cliente anon (RLS: is_active / available).
 */
export async function getHomePageData(): Promise<{
  banners: ActiveBanner[];
  categories: ActiveCategory[];
  latestProducts: CatalogProduct[];
}> {
  const [banners, categories, latestProducts] = await Promise.all([
    listActiveBanners(),
    listActiveCategories(),
    getLatestAvailableProducts(LATEST_PRODUCTS_LIMIT),
  ]);

  return { banners, categories, latestProducts };
}
