"use client";

import { Loader2 } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";

/**
 * Estado estável durante criação da preferência MP + redirect (SO-02 / #124).
 * Evita flash de empty-state após limpar o hold local.
 */
export function CheckoutMpHandoff() {
  return (
    <div
      className="grid gap-6 lg:grid-cols-[1fr_380px] lg:items-start"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex flex-col gap-3">
        <div className="rounded-2xl border border-border bg-card p-4">
          <Skeleton shimmer className="mb-3 h-5 w-28" />
          <Skeleton shimmer className="mb-2 h-11 w-full" />
          <Skeleton shimmer className="mb-2 h-11 w-full" />
          <Skeleton shimmer className="h-11 w-full" />
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <Skeleton shimmer className="mb-3 h-5 w-40" />
          <Skeleton shimmer className="h-24 w-full" />
        </div>
      </div>

      <aside className="lg:sticky lg:top-44 lg:z-10 lg:self-start">
        <div className="flex flex-col items-center gap-4 rounded-3xl border border-border bg-card p-6 text-center shadow-sm">
          <Loader2
            className="size-8 animate-spin text-primary"
            aria-hidden
          />
          <div className="flex flex-col gap-1">
            <p className="font-heading text-lg font-bold text-foreground">
              Abrindo o Mercado Pago…
            </p>
            <p className="text-sm text-muted-foreground">
              Estamos preparando seu pagamento. Não feche esta página.
            </p>
          </div>
          <div className="flex w-full flex-col gap-2 pt-2">
            <Skeleton shimmer className="h-4 w-full" />
            <Skeleton shimmer className="h-4 w-4/5 self-center" />
            <Skeleton shimmer className="mt-2 h-12 w-full rounded-full" />
          </div>
        </div>
      </aside>
    </div>
  );
}
