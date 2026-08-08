import "server-only";

import type { ProductStatus } from "@/features/admin/product-constants";
import type {
  CategoryOption,
  ProductRow,
  ProductWithImages,
} from "@/features/admin/product-types";
import { createServiceSupabaseClient } from "@/lib/supabase/server-service";

export type {
  CategoryOption,
  ProductImageRow,
  ProductRow,
  ProductWithImages,
} from "@/features/admin/product-types";

export type ListProductsParams = {
  q?: string;
  status?: ProductStatus | "all";
};

/** Hold ativo ligado à peça (timer + cliente na listagem SP-4). */
export type ProductHoldInfo = {
  expiresAt: string;
  customerName: string | null;
};

export type AdminProductListItem = ProductRow & {
  activeHold: ProductHoldInfo | null;
};

type HoldJoinRow = {
  product_id: string;
  hold_sessions: {
    expires_at: string;
    status: string;
    customers: { full_name: string } | null;
  } | null;
};

/**
 * Lista produtos para o admin (service role — vê todos os status).
 * Busca por nome, slug ou marca; filtra por status quando informado.
 */
export async function listAdminProducts({
  q,
  status = "all",
}: ListProductsParams = {}): Promise<ProductRow[]> {
  const supabase = createServiceSupabaseClient();

  let query = supabase
    .from("products")
    .select("*")
    .order("updated_at", { ascending: false });

  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  const term = q?.trim().replace(/[",()]/g, " ").replace(/\s+/g, " ").trim();
  if (term) {
    // ilike em name/slug/brand — PostgREST `or` com wildcards entre aspas
    const pattern = `%${term}%`;
    query = query.or(
      `name.ilike."${pattern}",slug.ilike."${pattern}",brand.ilike."${pattern}"`,
    );
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Falha ao listar produtos: ${error.message}`);
  }

  return data ?? [];
}

async function loadActiveHoldsByProductIds(
  productIds: string[],
): Promise<Map<string, ProductHoldInfo>> {
  const map = new Map<string, ProductHoldInfo>();
  if (productIds.length === 0) return map;

  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase
    .from("hold_items")
    .select(
      "product_id, hold_sessions!inner(expires_at, status, customers(full_name))",
    )
    .eq("hold_sessions.status", "active")
    .in("product_id", productIds);

  if (error) {
    console.error("listAdminProductsWithHolds hold_items:", error);
    return map;
  }

  for (const raw of data ?? []) {
    const row = raw as unknown as HoldJoinRow;
    const session = row.hold_sessions;
    if (!session || session.status !== "active") continue;
    map.set(row.product_id, {
      expiresAt: session.expires_at,
      customerName: session.customers?.full_name?.trim() || null,
    });
  }

  return map;
}

/**
 * Lista admin com Hold Session ativa (expires_at + nome do cliente) por peça.
 * Holds só aparecem na tela Produtos (SP-4) — não misturar na Separação.
 */
export async function listAdminProductsWithHolds(
  params: ListProductsParams = {},
): Promise<AdminProductListItem[]> {
  const products = await listAdminProducts(params);
  const holdIds = products
    .filter((product) => product.status === "hold")
    .map((product) => product.id);
  const holds = await loadActiveHoldsByProductIds(holdIds);

  return products.map((product) => ({
    ...product,
    activeHold: holds.get(product.id) ?? null,
  }));
}

export async function getAdminProduct(
  id: string,
): Promise<ProductWithImages | null> {
  const supabase = createServiceSupabaseClient();

  const { data, error } = await supabase
    .from("products")
    .select("*, product_images(*)")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(`Falha ao carregar produto: ${error.message}`);
  }

  if (!data) return null;

  const images = [...(data.product_images ?? [])].sort(
    (a, b) => a.sort_order - b.sort_order,
  );

  return { ...data, product_images: images };
}

export async function listActiveCategories(): Promise<CategoryOption[]> {
  const supabase = createServiceSupabaseClient();

  const { data, error } = await supabase
    .from("categories")
    .select("id, name, slug")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error(`Falha ao listar categorias: ${error.message}`);
  }

  return data ?? [];
}
