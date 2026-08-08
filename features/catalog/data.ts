import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

import {
  type CatalogFilters,
  resolveEffectiveSizeGroups,
} from "./filters";
import { mergeRelatedProducts } from "./related-products";
import type { CatalogProduct, ProductDetail, ProductImage } from "./types";

type SizeGroup = Database["public"]["Enums"]["size_group"];
type ProductGender = Database["public"]["Enums"]["product_gender"];

const CATALOG_SELECT =
  "id, name, slug, price, compare_at_price, cover_image_url, quantity, brand, size_label, created_at, gender, condition, status";

/** Statuses visibles no catálogo público (#97): available + hold (Reservada). */
const CATALOG_STATUSES = ["available", "hold"] as const;

/**
 * Produtos do catálogo público (available + hold), mais recentes primeiro.
 * Filtro opcional `soDisponiveis` restringe a available.
 * Respeita RLS anon SELECT em `products` com status available|hold.
 */
export async function getAvailableProducts(
  filters: CatalogFilters = {
    tamanho: [],
    genero: null,
    faixa: null,
    marca: [],
    conservacao: [],
    precoMax: null,
    soDisponiveis: false,
  },
  options?: { searchQuery?: string | null },
): Promise<CatalogProduct[]> {
  const supabase = await createServerSupabaseClient();

  let query = supabase
    .from("products")
    .select(CATALOG_SELECT)
    .order("created_at", { ascending: false });

  if (filters.soDisponiveis) {
    query = query.eq("status", "available");
  } else {
    query = query.in("status", [...CATALOG_STATUSES]);
  }

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

  if (filters.precoMax != null) {
    query = query.lte("price", filters.precoMax);
  }

  const q = options?.searchQuery?.trim();
  if (q) {
    const escaped = q.replace(/[%_]/g, "").slice(0, 80);
    if (escaped) {
      query = query.or(
        `name.ilike.%${escaped}%,brand.ilike.%${escaped}%,size_label.ilike.%${escaped}%`,
      );
    }
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Falha ao carregar catálogo: ${error.message}`);
  }

  return data ?? [];
}

/**
 * Marcas distintas em produtos available|hold (para o multi-select).
 */
export async function getAvailableBrands(): Promise<string[]> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("products")
    .select("brand")
    .in("status", [...CATALOG_STATUSES])
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

export type CatalogSearchSuggestion = {
  id: string;
  name: string;
  slug: string;
  brand: string | null;
  size_label: string | null;
  price: number;
  cover_image_url: string | null;
};

/**
 * Autocomplete do header (SS-2) — até 8 peças available|hold.
 */
export async function searchCatalogSuggestions(
  rawQuery: string,
  limit = 8,
): Promise<CatalogSearchSuggestion[]> {
  const q = rawQuery.trim().replace(/[%_]/g, "").slice(0, 80);
  if (q.length < 2) return [];

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("products")
    .select(
      "id, name, slug, brand, size_label, price, cover_image_url",
    )
    .in("status", [...CATALOG_STATUSES])
    .or(
      `name.ilike.%${q}%,brand.ilike.%${q}%,size_label.ilike.%${q}%`,
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("searchCatalogSuggestions:", error);
    return [];
  }

  return data ?? [];
}

type ProductDetailRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  compare_at_price: number | null;
  cover_image_url: string | null;
  brand: string | null;
  size_label: string;
  size_group: SizeGroup;
  gender: ProductGender;
  condition: Database["public"]["Enums"]["product_condition"];
  quantity: number;
  status: Database["public"]["Enums"]["product_status"];
  created_at: string;
  category_id: string | null;
  product_images:
    | {
        id: string;
        image_url: string;
        alt_text: string | null;
        sort_order: number;
      }[]
    | null;
};

/**
 * PDP: produto available|hold por slug + imagens ordenadas por `sort_order`.
 * Hold permanece visível (dona com countdown; outras veem Reservada).
 */
export async function getProductBySlug(slug: string): Promise<ProductDetail | null> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("products")
    .select(
      `
      id,
      name,
      slug,
      description,
      price,
      compare_at_price,
      cover_image_url,
      brand,
      size_label,
      size_group,
      gender,
      condition,
      quantity,
      status,
      created_at,
      category_id,
      product_images ( id, image_url, alt_text, sort_order )
    `,
    )
    .eq("slug", slug)
    .in("status", [...CATALOG_STATUSES])
    .maybeSingle();

  if (error) {
    throw new Error(`Falha ao carregar produto: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  return mapProductDetail(data as ProductDetailRow);
}

/**
 * Peças relacionadas: primeiro size_group+gender; se faltar, completa com
 * mesmo gender, depois mesma faixa (size_group), depois mesma categoria.
 * Inclui hold para exibir Reservada no carrossel.
 */
export async function getRelatedProducts(options: {
  productId: string;
  sizeGroup: SizeGroup;
  gender: ProductGender;
  categoryId?: string | null;
  limit?: number;
}): Promise<CatalogProduct[]> {
  const { productId, sizeGroup, gender, categoryId, limit = 8 } = options;
  const supabase = await createServerSupabaseClient();

  async function query(extra: {
    sizeGroup?: SizeGroup;
    gender?: ProductGender;
    categoryId?: string;
  }): Promise<CatalogProduct[]> {
    let q = supabase
      .from("products")
      .select(CATALOG_SELECT)
      .in("status", [...CATALOG_STATUSES])
      .neq("id", productId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (extra.sizeGroup) q = q.eq("size_group", extra.sizeGroup);
    if (extra.gender) q = q.eq("gender", extra.gender);
    if (extra.categoryId) q = q.eq("category_id", extra.categoryId);

    const { data, error } = await q;
    if (error) {
      throw new Error(`Falha ao carregar peças relacionadas: ${error.message}`);
    }
    return data ?? [];
  }

  const primary = await query({ sizeGroup, gender });
  if (primary.length >= limit) {
    return primary.slice(0, limit);
  }

  const byGender = await query({ gender });
  const bySize = await query({ sizeGroup });
  const byCategory =
    categoryId != null && categoryId !== ""
      ? await query({ categoryId })
      : [];

  return mergeRelatedProducts(
    productId,
    limit,
    primary,
    byGender,
    bySize,
    byCategory,
  );
}

function mapProductDetail(row: ProductDetailRow): ProductDetail {
  const fromTable: ProductImage[] = [...(row.product_images ?? [])]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((image) => ({
      id: image.id,
      image_url: image.image_url,
      alt_text: image.alt_text,
      sort_order: image.sort_order,
    }));

  const images =
    fromTable.length > 0
      ? fromTable
      : row.cover_image_url
        ? [
            {
              id: `${row.id}-cover`,
              image_url: row.cover_image_url,
              alt_text: row.name,
              sort_order: 0,
            },
          ]
        : [];

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    price: row.price,
    compare_at_price: row.compare_at_price,
    cover_image_url: row.cover_image_url,
    brand: row.brand,
    size_label: row.size_label,
    size_group: row.size_group,
    gender: row.gender,
    condition: row.condition,
    quantity: row.quantity,
    status: row.status,
    created_at: row.created_at,
    category_id: row.category_id,
    images,
  };
}

/**
 * Últimas novidades para a home — só available (vitrine "prontas para comprar").
 */
export async function getLatestAvailableProducts(
  limit = 8,
): Promise<CatalogProduct[]> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("products")
    .select(CATALOG_SELECT)
    .eq("status", "available")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Falha ao carregar novidades: ${error.message}`);
  }

  return data ?? [];
}
