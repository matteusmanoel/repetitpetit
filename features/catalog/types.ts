import type { Database } from "@/lib/supabase/types";

export type ProductRow = Database["public"]["Tables"]["products"]["Row"];
export type ProductImageRow = Database["public"]["Tables"]["product_images"]["Row"];

/**
 * Campos usados pelo grid do catálogo — subset tipado de `products`.
 * `gender` e `condition` entraram na T0 do refactor de UI (docs/09-decisions.md
 * D57) para a borda por gênero e a pill de conservação do `ProductCard`.
 */
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
  | "gender"
  | "condition"
  | "status"
>;

/** Imagem da galeria na PDP (ordenada por `sort_order`). */
export type ProductImage = Pick<
  ProductImageRow,
  "id" | "image_url" | "alt_text" | "sort_order"
>;

/** Produto completo para `/produto/[slug]`. */
export type ProductDetail = Pick<
  ProductRow,
  | "id"
  | "name"
  | "slug"
  | "description"
  | "price"
  | "compare_at_price"
  | "cover_image_url"
  | "brand"
  | "size_label"
  | "size_group"
  | "gender"
  | "condition"
  | "quantity"
  | "status"
  | "created_at"
  | "category_id"
> & {
  images: ProductImage[];
};

/**
 * Visão da reserva ativa na PDP, relativa à sessão do cookie `rp_cart_session`.
 * `anon` não tem SELECT em `cart_reservations` — a leitura usa service role.
 */
export type ReservationView =
  | { kind: "none" }
  | { kind: "other" }
  | { kind: "own"; expiresAt: string };
