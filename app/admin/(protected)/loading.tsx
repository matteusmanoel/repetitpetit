/**
 * Espelha `app/admin/(protected)/page.tsx` (Painel): header + stock + ops + charts.
 */
export default function AdminLoading() {
  return (
    <div
      className="mx-auto flex w-full max-w-5xl flex-col gap-6 pb-4"
      aria-busy="true"
      aria-label="Carregando painel"
    >
      <header>
        <div className="h-8 w-28 animate-pulse rounded-lg bg-muted sm:h-9" />
        <div className="mt-2 h-4 w-64 max-w-full animate-pulse rounded-lg bg-muted" />
      </header>

      <div className="h-[5.5rem] animate-pulse rounded-2xl border border-black/5 bg-white shadow-sm sm:h-24" />

      <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <li
            key={index}
            className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm"
          >
            <div className="h-3 w-20 animate-pulse rounded bg-muted" />
            <div className="mt-3 h-7 w-16 animate-pulse rounded bg-muted" />
          </li>
        ))}
      </ul>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="h-56 animate-pulse rounded-2xl border border-black/5 bg-white shadow-sm" />
        <div className="h-56 animate-pulse rounded-2xl border border-black/5 bg-white shadow-sm" />
      </div>
    </div>
  );
}
