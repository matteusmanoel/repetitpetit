export type ProductStatus = "available" | "reserved" | "sold" | "hidden";

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  compare_at_price: number | null;
  cover_image_url: string | null;
  brand: string | null;
  size_label: string | null;
  gender: string | null;
  condition: string | null;
  status: ProductStatus;
}
