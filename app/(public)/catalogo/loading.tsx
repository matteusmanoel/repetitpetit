import { ProductCardSkeletonGrid } from "@/features/catalog/components/ProductCardSkeleton";

/**
 * Espelha `app/(public)/catalogo/page.tsx`: header + sidebar filtros + grid.
 */
export default function CatalogoLoading() {
  return (
    <div
      className="mx-auto w-full max-w-6xl px-4 py-6 md:py-8"
      aria-busy="true"
      aria-label="Carregando catálogo"
    >
      <header className="mb-4 flex flex-col gap-1 sm:mb-6">
        <div className="h-8 w-36 animate-pulse rounded-lg bg-muted md:h-9" />
        <div className="h-4 w-72 max-w-full animate-pulse rounded-lg bg-muted" />
      </header>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr] lg:gap-8">
        <aside className="hidden lg:block">
          <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="h-4 w-20 animate-pulse rounded bg-muted" />
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 4 }, (_, i) => (
                <div
                  key={i}
                  className="h-9 w-20 animate-pulse rounded-full bg-muted"
                />
              ))}
            </div>
            <div className="mt-2 h-4 w-16 animate-pulse rounded bg-muted" />
            <div className="h-10 w-full animate-pulse rounded-xl bg-muted" />
            <div className="mt-2 h-4 w-24 animate-pulse rounded bg-muted" />
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 6 }, (_, i) => (
                <div
                  key={i}
                  className="h-8 w-16 animate-pulse rounded-full bg-muted"
                />
              ))}
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-col gap-4">
          <div className="flex h-11 items-center lg:hidden">
            <div className="h-11 w-36 animate-pulse rounded-2xl bg-muted" />
          </div>
          <ProductCardSkeletonGrid count={9} />
        </div>
      </div>
    </div>
  );
}
