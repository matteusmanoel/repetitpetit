import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";

import type { CatalogProduct } from "./types";

/**
 * Produtos disponíveis para o catálogo público, mais recentes primeiro.
 * Respeita RLS (anon SELECT em `products` com status available).
 */
export async function getAvailableProducts(): Promise<CatalogProduct[]> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("products")
    .select(
      "id, name, slug, price, compare_at_price, cover_image_url, quantity, brand, size_label, created_at",
    )
    .eq("status", "available")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Falha ao carregar catálogo: ${error.message}`);
  }

  return data ?? [];
}
