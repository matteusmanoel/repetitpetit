import Link from "next/link";

import { MediaThumb } from "@/components/shared/media-thumb";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/features/catalog/format-price";
import type { CatalogProduct } from "@/features/catalog/types";

type ProductCardProps = {
  product: CatalogProduct;
  priority?: boolean;
};

export function ProductCard({ product, priority = false }: ProductCardProps) {
  const compareAt = product.compare_at_price;
  const hasCompare = compareAt != null && compareAt > product.price;

  return (
    <Link
      href={`/produto/${product.slug}`}
      className="group flex flex-col gap-2 rounded-lg outline-none transition-opacity focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <div className="relative overflow-hidden rounded-lg">
        <MediaThumb
          src={product.cover_image_url}
          alt={product.name}
          priority={priority}
          className="transition-transform duration-300 group-hover:scale-[1.02] group-active:scale-[1.01]"
        />
        {product.quantity === 1 ? (
          <Badge
            variant="destructive"
            className="absolute top-2 left-2 z-10 h-auto px-2 py-1 text-xs font-medium shadow-sm"
          >
            Peça única
          </Badge>
        ) : null}
      </div>

      <div className="flex flex-col gap-0.5 px-0.5">
        {(product.brand || product.size_label) && (
          <p className="text-xs text-muted-foreground">
            {[product.brand, product.size_label].filter(Boolean).join(" · ")}
          </p>
        )}
        <h2 className="font-heading line-clamp-2 text-sm font-bold text-foreground sm:text-base">
          {product.name}
        </h2>
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="text-base font-medium text-primary">
            {formatPrice(product.price)}
          </span>
          {hasCompare ? (
            <span className="text-sm text-muted-foreground line-through">
              {formatPrice(compareAt)}
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
