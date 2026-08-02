import { Skeleton } from "@/components/ui/skeleton";

export function ProductCardSkeleton() {
  return (
    <div className="flex flex-col gap-2" aria-hidden>
      <Skeleton className="aspect-3/4 w-full rounded-lg" />
      <div className="flex flex-col gap-1.5 px-0.5">
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-4 w-1/4" />
      </div>
    </div>
  );
}

export function ProductCardSkeletonGrid({ count = 8 }: { count?: number }) {
  return (
    <ul
      className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 lg:gap-6"
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
