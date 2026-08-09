export default function AdminLoading() {
  return (
    <div
      className="flex flex-col gap-4 p-1"
      aria-busy="true"
      aria-label="Carregando admin"
    >
      <div className="h-8 w-48 animate-pulse rounded-lg bg-muted" />
      <div className="h-4 w-72 max-w-full animate-pulse rounded-lg bg-muted" />
      <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <div
            key={index}
            className="h-36 animate-pulse rounded-2xl bg-muted"
          />
        ))}
      </div>
      <div className="mt-2 h-64 animate-pulse rounded-2xl bg-muted" />
    </div>
  );
}
