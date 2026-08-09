import { Skeleton } from "@/components/ui/skeleton";

export default function PublicLoading() {
  return (
    <div
      className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8"
      aria-busy="true"
      aria-label="Carregando página"
    >
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-5 w-72 max-w-full" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} className="aspect-3/4 w-full rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
