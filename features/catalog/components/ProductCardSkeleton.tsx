import { Skeleton } from "@/components/ui/skeleton";

/** Espelha a anatomia do `ProductCard` TipTop (D0 / SQ-3). */
export function ProductCardSkeleton() {
  return (
    <div
      className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
      aria-hidden
    >
      <Skeleton shimmer className="aspect-3/4 w-full rounded-none" />
      <div className="flex min-h-[5.75rem] flex-1 flex-col space-y-2 px-2.5 pb-3 pt-2">
        <Skeleton shimmer className="h-3 w-1/3" />
        <Skeleton shimmer className="h-4 w-4/5" />
        <Skeleton shimmer className="mt-auto h-6 w-20" />
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
        <li key={i} className="h-full">
          <ProductCardSkeleton />
        </li>
      ))}
    </ul>
  );
}
