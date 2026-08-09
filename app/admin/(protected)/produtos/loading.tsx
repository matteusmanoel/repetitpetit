export default function AdminProdutosLoading() {
  return (
    <div
      className="flex flex-col gap-6"
      aria-busy="true"
      aria-label="Carregando produtos"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-2">
          <div className="h-7 w-36 animate-pulse rounded-lg bg-muted" />
          <div className="h-4 w-56 animate-pulse rounded-lg bg-muted" />
        </div>
        <div className="h-8 w-28 animate-pulse rounded-lg bg-muted" />
      </div>
      <div className="h-11 w-full animate-pulse rounded-xl bg-muted" />
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }, (_, index) => (
          <li
            key={index}
            className="overflow-hidden rounded-2xl border border-border bg-card"
          >
            <div className="aspect-[3/4] animate-pulse bg-muted" />
            <div className="space-y-2 p-3">
              <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
              <div className="h-4 w-4/5 animate-pulse rounded bg-muted" />
              <div className="h-6 w-20 animate-pulse rounded bg-muted" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
