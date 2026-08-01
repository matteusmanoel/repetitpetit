import type { Tables } from "@/lib/supabase/types";

export type ProductRow = Tables<"products">;
export type ProductImageRow = Tables<"product_images">;
export type CategoryOption = Pick<Tables<"categories">, "id" | "name" | "slug">;

export type ProductWithImages = ProductRow & {
  product_images: ProductImageRow[];
};
