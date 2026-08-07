import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { MediaThumb } from "@/components/shared/media-thumb";
import { formatPrice } from "@/features/catalog/format-price";
import type { CatalogProduct } from "@/features/catalog/types";
import { cn } from "@/lib/utils";

type ProductCardProps = {
  product: CatalogProduct;
  priority?: boolean;
};

function genderAccentClass(gender: CatalogProduct["gender"]): string {
  if (gender === "menina") return "text-brand-pink";
  if (gender === "menino") return "text-brand-blue";
  return "text-brand-green";
}

/**
 * Card TipTop→Repeti (D112): preço verde, acento de gênero no tamanho,
 * hover elevação — sem borda grossa de gênero (chrome TipTop).
 */
export function ProductCard({ product, priority = false }: ProductCardProps) {
  const compareAt = product.compare_at_price;
  const hasCompare = compareAt != null && compareAt > product.price;

  return (
    <Link
      href={`/produto/${product.slug}`}
      className={cn(
        "group flex w-full flex-col text-left outline-none transition hover:-translate-y-1",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      )}
    >
      <article className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition group-hover:shadow-lg">
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
            <Badge className="absolute top-2 left-2 z-10 h-auto rounded-full bg-destructive px-2 py-0.5 text-[10px] font-bold text-destructive-foreground uppercase shadow-sm">
              Única
            </Badge>
          ) : null}
        </div>

        <div className="space-y-1 px-2.5 pb-3 pt-2">
          {(product.brand || product.size_label) && (
            <p
              className={cn(
                "text-sm font-semibold tracking-wide",
                genderAccentClass(product.gender),
              )}
            >
              {[product.size_label, product.brand].filter(Boolean).join(" · ")}
            </p>
          )}

          <h2 className="line-clamp-2 text-[13px] font-medium leading-snug text-foreground/90 md:text-sm">
            {product.name}
          </h2>

          <div className="flex items-baseline gap-2 pt-0.5">
            <span className="text-lg font-bold text-primary md:text-xl">
              {formatPrice(product.price)}
            </span>
            {hasCompare ? (
              <span className="text-xs text-destructive line-through">
                {formatPrice(compareAt)}
              </span>
            ) : null}
          </div>
        </div>
      </article>
    </Link>
  );
}
