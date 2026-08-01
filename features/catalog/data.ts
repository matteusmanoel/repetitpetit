import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

import {
  PRICE_RANGE_BOUNDS,
  type CatalogFilters,
  resolveEffectiveSizeGroups,
} from "./filters";
import type { CatalogProduct, ProductDetail, ProductImage } from "./types";

type SizeGroup = Database["public"]["Enums"]["size_group"];
type ProductGender = Database["public"]["Enums"]["product_gender"];

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
 * PDP: produto disponível por slug + imagens ordenadas por `sort_order`.
 * Se não houver linhas em `product_images`, usa `cover_image_url` como única foto.
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
      product_images ( id, image_url, alt_text, sort_order )
    `,
    )
    .eq("slug", slug)
    .eq("status", "available")
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
 * Peças relacionadas por `size_group` e `gender` (excluindo a atual).
 */
export async function getRelatedProducts(options: {
  productId: string;
  sizeGroup: SizeGroup;
  gender: ProductGender;
  limit?: number;
}): Promise<CatalogProduct[]> {
  const { productId, sizeGroup, gender, limit = 8 } = options;
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("products")
    .select(CATALOG_PRODUCT_COLUMNS)
    .eq("status", "available")
    .eq("size_group", sizeGroup)
    .eq("gender", gender)
    .neq("id", productId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Falha ao carregar peças relacionadas: ${error.message}`);
  }

  return data ?? [];
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
    images,
  };
}

/**
 * Últimas novidades para a home — mesmo critério do catálogo, com limite.
 */
export async function getLatestAvailableProducts(
  limit = 8,
): Promise<CatalogProduct[]> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("products")
    .select(
      "id, name, slug, price, compare_at_price, cover_image_url, quantity, brand, size_label, created_at",
    )
    .eq("status", "available")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Falha ao carregar novidades: ${error.message}`);
  }

  return data ?? [];
}
