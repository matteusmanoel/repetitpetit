import type { Database } from "@/lib/supabase/types";

export type ProductRow = Database["public"]["Tables"]["products"]["Row"];

/** Campos usados pelo grid do catálogo — subset tipado de `products`. */
export type CatalogProduct = Pick<
  ProductRow,
  | "id"
  | "name"
  | "slug"
  | "price"
  | "compare_at_price"
  | "cover_image_url"
  | "quantity"
  | "brand"
  | "size_label"
  | "created_at"
>;
