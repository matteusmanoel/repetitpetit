import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { MediaThumb } from "@/components/shared/media-thumb";
import { ProductCardQuickAdd } from "@/features/catalog/components/ProductCardQuickAdd";
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
 * Card TipTop→Repeti (D112 / SQ-3 / SS-3): altura fixa + nome truncado,
 * hover ATC no desktop substitui a faixa de preço (padrão TipTop).
 * Hold: botão "Reservada" disabled no lugar do ATC.
 */
export function ProductCard({ product, priority = false }: ProductCardProps) {
  const compareAt = product.compare_at_price;
  const hasCompare = compareAt != null && compareAt > product.price;
  const isHold = product.status === "hold";
  const canQuickAdd = product.status === "available";
  const showHoverAction = canQuickAdd || isHold;

  return (
    <Link
      href={`/produto/${product.slug}`}
      className={cn(
        "group flex h-full w-full flex-col text-left outline-none transition hover:-translate-y-1",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      )}
    >
      <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition group-hover:shadow-lg">
        <div className="relative">
          <MediaThumb
            src={product.cover_image_url}
            alt={product.name}
            priority={priority}
          />
          {isHold ? (
            <Badge className="absolute top-2 left-2 z-10 h-auto rounded-full bg-muted px-2.5 py-1 text-[11px] font-bold tracking-wide text-foreground uppercase shadow-sm ring-1 ring-border">
              Reservada
            </Badge>
          ) : product.quantity === 1 ? (
            <Badge className="absolute top-2 left-2 z-10 h-auto rounded-full bg-destructive px-2 py-0.5 text-[10px] font-bold text-destructive-foreground uppercase shadow-sm">
              Única
            </Badge>
          ) : null}
        </div>

        <div className="flex min-h-[5.75rem] flex-1 flex-col space-y-1 px-2.5 pb-3 pt-2">
          {(product.brand || product.size_label) && (
            <p
              className={cn(
                "truncate text-sm font-semibold tracking-wide",
                genderAccentClass(product.gender),
              )}
            >
              {[product.size_label, product.brand].filter(Boolean).join(" · ")}
            </p>
          )}

          <h2 className="truncate text-[13px] font-medium leading-snug text-foreground/90 md:text-sm">
            {product.name}
          </h2>

          {/* Faixa de preço ↔ ATC / Reservada no hover (desktop TipTop) */}
          <div className="relative mt-auto min-h-11 pt-0.5">
            <div
              className={cn(
                "flex items-baseline gap-2 transition-opacity duration-150",
                showHoverAction &&
                  "md:group-hover:pointer-events-none md:group-hover:opacity-0",
              )}
            >
              <span className="text-lg font-bold text-primary md:text-xl">
                {formatPrice(product.price)}
              </span>
              {hasCompare ? (
                <span className="text-xs text-destructive line-through">
                  {formatPrice(compareAt)}
                </span>
              ) : null}
            </div>

            {showHoverAction ? (
              <div className="pointer-events-none absolute inset-x-0 bottom-0 hidden opacity-0 transition-opacity duration-150 md:block md:group-hover:pointer-events-auto md:group-hover:opacity-100 md:group-focus-within:pointer-events-auto md:group-focus-within:opacity-100">
                {isHold ? (
                  <button
                    type="button"
                    disabled
                    aria-disabled="true"
                    className="flex h-11 w-full cursor-not-allowed items-center justify-center rounded-full bg-muted px-3 text-sm font-semibold text-muted-foreground ring-1 ring-border"
                  >
                    Reservada
                  </button>
                ) : (
                  <ProductCardQuickAdd
                    productId={product.id}
                    name={product.name}
                    slug={product.slug}
                    price={product.price}
                    coverImageUrl={product.cover_image_url}
                  />
                )}
              </div>
            ) : null}
          </div>
        </div>
      </article>
    </Link>
  );
}
