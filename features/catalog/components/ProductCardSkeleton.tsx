import { Skeleton } from "@/components/ui/skeleton";

/** Espelha a anatomia do `ProductCard` (T1) — borda, foto, pill e preço. */
export function ProductCardSkeleton() {
  return (
    <div
      className="flex flex-col overflow-hidden rounded-2xl border-2 border-border bg-card"
      aria-hidden
    >
      <Skeleton shimmer className="aspect-3/4 w-full rounded-none" />
      <div className="flex flex-col gap-2 p-3">
        <div className="flex items-center justify-between gap-2">
          <Skeleton shimmer className="h-3 w-1/3" />
          <Skeleton shimmer className="h-3 w-10" />
        </div>
        <Skeleton shimmer className="h-4 w-4/5" />
        <div className="flex items-end justify-between gap-2 pt-0.5">
          <Skeleton shimmer className="h-6 w-20 rounded-full" />
          <Skeleton shimmer className="h-5 w-14" />
        </div>
      </div>
    </div>
  );
}

export function ProductCardSkeletonGrid({ count = 8 }: { count?: number }) {
  return (
    <ul
      className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
      aria-busy="true"
      aria-label="Carregando peças"
    >
      {Array.from({ length: count }, (_, i) => (
        <li key={i}>
          <ProductCardSkeleton />
        </li>
      ))}
    </ul>
  );
}
