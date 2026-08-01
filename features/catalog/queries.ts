import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Product } from "./types";

export interface CatalogResult {
  products: Product[];
  error: string | null;
}

/**
 * Fetches available products from Supabase.
 * Returns a structured result so the UI can render a graceful empty/error
 * state (e.g. before the DB schema/seed have been applied).
 */
export async function getAvailableProducts(limit = 24): Promise<CatalogResult> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("products")
    .select(
      "id,name,slug,description,price,compare_at_price,cover_image_url,brand,size_label,gender,condition,status",
    )
    .eq("status", "available")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return { products: [], error: error.message };
  }

  return { products: (data ?? []) as Product[], error: null };
}
