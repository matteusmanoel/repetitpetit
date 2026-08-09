/**
 * Espelha checkout: seções empilhadas (contato / frete / resumo).
 */
export default function CheckoutLoading() {
  return (
    <div
      className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8"
      aria-busy="true"
      aria-label="Carregando checkout"
    >
      <div className="h-8 w-40 animate-pulse rounded-lg bg-muted" />
      <div className="h-4 w-56 animate-pulse rounded-lg bg-muted" />
      {Array.from({ length: 3 }, (_, index) => (
        <div
          key={index}
          className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm"
        >
          <div className="h-5 w-32 animate-pulse rounded bg-muted" />
          <div className="h-11 w-full animate-pulse rounded-xl bg-muted" />
          <div className="h-11 w-full animate-pulse rounded-xl bg-muted" />
        </div>
      ))}
      <div className="h-14 w-full animate-pulse rounded-2xl bg-muted" />
    </div>
  );
}
