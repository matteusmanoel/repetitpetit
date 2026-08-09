/**
 * Espelha `BannersAdminClient`: header + lista com thumb.
 */
export default function AdminBannersLoading() {
  return (
    <div
      className="flex flex-col gap-6"
      aria-busy="true"
      aria-label="Carregando banners"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2">
          <div className="h-8 w-32 animate-pulse rounded-lg bg-muted" />
          <div className="h-4 w-64 max-w-full animate-pulse rounded-lg bg-muted" />
        </div>
        <div className="h-9 w-32 animate-pulse rounded-lg bg-muted" />
      </div>
      <ul className="divide-y divide-border rounded-lg border border-border">
        {Array.from({ length: 4 }, (_, index) => (
          <li
            key={index}
            className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex min-w-0 items-start gap-3">
              <div className="h-14 w-24 shrink-0 animate-pulse rounded-md bg-muted" />
              <div className="flex flex-col gap-2 py-1">
                <div className="h-4 w-40 animate-pulse rounded bg-muted" />
                <div className="h-3 w-28 animate-pulse rounded bg-muted" />
              </div>
            </div>
            <div className="flex gap-2">
              <div className="h-8 w-16 animate-pulse rounded-lg bg-muted" />
              <div className="h-8 w-16 animate-pulse rounded-lg bg-muted" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
