import { ProductCardSkeletonGrid } from "@/features/catalog/components/ProductCardSkeleton";

/**
 * Home loading — espelha banner + filtro de idade + grade de novidades.
 * Segmento dedicado: `app/(public)/(home)/` não existe; usamos este arquivo
 * só em rotas que o reexportam. Preferimos loading por rota específica.
 */
export function HomePageSkeleton() {
  return (
    <div
      className="flex w-full flex-1 flex-col"
      aria-busy="true"
      aria-label="Carregando início"
    >
      <div className="aspect-[21/9] w-full animate-pulse bg-muted sm:aspect-[3/1]" />
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-6">
        <div className="flex justify-center gap-2 overflow-hidden">
          {Array.from({ length: 5 }, (_, index) => (
            <div
              key={index}
              className="h-10 w-20 shrink-0 animate-pulse rounded-full bg-muted"
            />
          ))}
        </div>
        <div className="h-6 w-40 animate-pulse rounded-lg bg-muted" />
        <ProductCardSkeletonGrid count={6} />
      </div>
    </div>
  );
}
