import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";

import {
  PRICE_RANGE_BOUNDS,
  type CatalogFilters,
  resolveEffectiveSizeGroups,
} from "./filters";
import type { CatalogProduct } from "./types";

const CATALOG_SELECT =
  "id, name, slug, price, compare_at_price, cover_image_url, quantity, brand, size_label, created_at";

/**
 * Produtos disponíveis para o catálogo público, mais recentes primeiro.
 * Respeita RLS (anon SELECT em `products` com status available).
 * Filtros opcionais via query params (T07).
 */
export async function getAvailableProducts(
  filters: CatalogFilters = {
    tamanho: [],
    genero: null,
    faixa: null,
    marca: [],
    conservacao: [],
    preco: null,
  },
): Promise<CatalogProduct[]> {
  const supabase = await createServerSupabaseClient();

  let query = supabase
    .from("products")
    .select(CATALOG_SELECT)
    .eq("status", "available")
    .order("created_at", { ascending: false });

  const sizeGroups = resolveEffectiveSizeGroups(filters);
  if (sizeGroups != null) {
    if (sizeGroups.length === 0) {
      // Interseção vazia (ex.: tamanho fora da faixa) → nenhum resultado.
      return [];
    }
    query = query.in("size_group", sizeGroups);
  }

  if (filters.genero) {
    query = query.eq("gender", filters.genero);
  }

  if (filters.marca.length > 0) {
    query = query.in("brand", filters.marca);
  }

  if (filters.conservacao.length > 0) {
    query = query.in("condition", filters.conservacao);
  }

  if (filters.preco) {
    const bounds = PRICE_RANGE_BOUNDS[filters.preco];
    if (bounds.gt != null) {
      query = query.gt("price", bounds.gt);
    }
    if (bounds.lte != null) {
      query = query.lte("price", bounds.lte);
    }
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Falha ao carregar catálogo: ${error.message}`);
  }

  return data ?? [];
}

/**
 * Marcas distintas presentes em produtos disponíveis (para o multi-select).
 */
export async function getAvailableBrands(): Promise<string[]> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("products")
    .select("brand")
    .eq("status", "available")
    .not("brand", "is", null)
    .order("brand", { ascending: true });

  if (error) {
    throw new Error(`Falha ao carregar marcas: ${error.message}`);
  }

  const brands = new Set<string>();
  for (const row of data ?? []) {
    const brand = row.brand?.trim();
    if (brand) brands.add(brand);
  }

  return [...brands].sort((a, b) =>
    a.localeCompare(b, "pt-BR", { sensitivity: "base" }),
  );
}
