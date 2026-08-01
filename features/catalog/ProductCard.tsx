import Image from "next/image";
import Link from "next/link";
import type { Product } from "./types";

const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function ProductCard({ product }: { product: Product }) {
  return (
    <Link
      href={`/produto/${product.slug}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-shadow hover:shadow-md"
    >
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-muted">
        {product.cover_image_url ? (
          <Image
            src={product.cover_image_url}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 50vw, 25vw"
            className="object-cover transition-transform group-hover:scale-105"
          />
        ) : null}
        <span className="absolute left-2 top-2 rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold text-secondary-foreground">
          Peça única
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <h3 className="line-clamp-2 text-sm font-medium">{product.name}</h3>
        {product.size_label ? (
          <p className="text-xs text-muted-foreground">
            {product.size_label}
            {product.brand ? ` · ${product.brand}` : ""}
          </p>
        ) : null}
        <div className="mt-auto flex items-baseline gap-2 pt-1">
          <span className="font-display text-base font-bold text-primary">
            {brl.format(product.price)}
          </span>
          {product.compare_at_price ? (
            <span className="text-xs text-muted-foreground line-through">
              {brl.format(product.compare_at_price)}
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
