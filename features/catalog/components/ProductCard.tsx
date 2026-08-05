import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { MediaThumb } from "@/components/shared/media-thumb";
import { PRODUCT_CONDITION_LABELS } from "@/features/catalog/filters";
import { formatPrice } from "@/features/catalog/format-price";
import type { CatalogProduct } from "@/features/catalog/types";
import {
  CONDITION_PILL_CLASS,
  GENDER_BORDER_CLASS,
} from "@/features/catalog/ui-tokens";
import { cn } from "@/lib/utils";

type ProductCardProps = {
  product: CatalogProduct;
  priority?: boolean;
};

/**
 * Card do grid de catálogo/home — deve comunicar tudo sem precisar clicar:
 * borda por gênero, badge "Peça única", pill de conservação e preço.
 * Ver docs/09-decisions.md D57 para os tokens de gender/condition.
 */
export function ProductCard({ product, priority = false }: ProductCardProps) {
  const compareAt = product.compare_at_price;
  const hasCompare = compareAt != null && compareAt > product.price;

  return (
    <Link
      href={`/produto/${product.slug}`}
      className={cn(
        "group flex flex-col overflow-hidden rounded-2xl border-2 bg-card outline-none",
        "transition-all duration-200 ease-out",
        "hover:scale-[1.02] hover:shadow-md active:scale-[0.99]",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        GENDER_BORDER_CLASS[product.gender],
      )}
    >
      <div className="relative">
        <MediaThumb
          src={product.cover_image_url}
          alt={product.name}
          priority={priority}
        />
        {product.status === "hold" ? (
          <Badge className="absolute top-2 left-2 z-10 h-auto rounded-full bg-muted px-2.5 py-1 text-[11px] font-bold tracking-wide text-foreground uppercase shadow-sm ring-1 ring-border">
            Reservada
          </Badge>
        ) : product.quantity === 1 ? (
          <Badge className="absolute top-2 left-2 z-10 h-auto rounded-full bg-destructive px-2.5 py-1 text-[11px] font-bold tracking-wide text-destructive-foreground uppercase shadow-sm">
            Peça única
          </Badge>
        ) : null}
        {product.status === "hold" && product.quantity === 1 ? (
          <Badge className="absolute top-2 right-2 z-10 h-auto rounded-full bg-destructive/90 px-2 py-0.5 text-[10px] font-bold tracking-wide text-destructive-foreground uppercase shadow-sm">
            Única
          </Badge>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5 p-3">
        {(product.brand || product.size_label) && (
          <p className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
            <span className="truncate">{product.brand}</span>
            {product.size_label ? (
              <span className="shrink-0 font-medium text-foreground/70">
                {product.size_label}
              </span>
            ) : null}
          </p>
        )}

        <h2 className="font-heading line-clamp-2 text-base leading-snug font-semibold text-foreground">
          {product.name}
        </h2>

        <div className="flex items-end justify-between gap-2 pt-0.5">
          <span
            className={cn(
              "inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-medium",
              CONDITION_PILL_CLASS[product.condition],
            )}
          >
            {PRODUCT_CONDITION_LABELS[product.condition]}
          </span>

          <div className="flex flex-col items-end">
            <span className="text-base font-bold text-primary">
              {formatPrice(product.price)}
            </span>
            {hasCompare ? (
              <span className="text-xs text-destructive line-through">
                {formatPrice(compareAt)}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </Link>
  );
}
