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
