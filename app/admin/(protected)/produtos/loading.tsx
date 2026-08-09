/**
 * Espelha `AdminProductsClient`: título + ações, busca/chips, cards com footer.
 */
export default function AdminProdutosLoading() {
  return (
    <div
      className="flex flex-col gap-6"
      aria-busy="true"
      aria-label="Carregando produtos"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <div className="h-7 w-28 animate-pulse rounded-lg bg-muted" />
          <div className="h-4 w-56 animate-pulse rounded-lg bg-muted" />
        </div>
        <div className="flex gap-2">
          <div className="h-8 w-28 animate-pulse rounded-lg bg-muted" />
          <div className="h-8 w-28 animate-pulse rounded-lg bg-muted" />
          <div className="h-8 w-24 animate-pulse rounded-lg bg-muted" />
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="h-11 flex-1 animate-pulse rounded-xl bg-muted" />
        <div className="flex gap-2">
          {Array.from({ length: 4 }, (_, index) => (
            <div
              key={index}
              className="h-11 w-24 shrink-0 animate-pulse rounded-xl bg-muted"
            />
          ))}
        </div>
      </div>

      <div className="h-4 w-28 animate-pulse rounded bg-muted" />

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }, (_, index) => (
          <li
            key={index}
            className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
          >
            <div className="aspect-[3/4] animate-pulse bg-muted" />
            <div className="flex flex-1 flex-col space-y-1 p-3">
              <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
              <div className="min-h-[2.5rem] space-y-1">
                <div className="h-3.5 w-full animate-pulse rounded bg-muted" />
                <div className="h-3.5 w-4/5 animate-pulse rounded bg-muted" />
              </div>
              <div className="h-4 w-24 animate-pulse rounded bg-muted" />
              <div className="mt-auto h-6 w-20 animate-pulse rounded bg-muted" />
            </div>
            <div className="mt-auto border-t border-border p-2">
              <div className="h-11 w-full animate-pulse rounded-xl bg-muted" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
