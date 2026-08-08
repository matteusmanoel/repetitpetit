"use client";

/**
 * PROTOTYPE — Admin Ops UX (Slice P) rev.3 HITL.
 * Default C = rail + Separação split (B).
 */

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Toaster } from "sonner";

import {
  PrototypeSwitcher,
  type PrototypeVariantMeta,
} from "@/components/prototype/PrototypeSwitcher";

import { PrototypeStateProvider, usePrototypeState } from "./prototype-state";
import { VariantA, VariantB, VariantC } from "./variants";

const VARIANTS: PrototypeVariantMeta[] = [
  { key: "C", label: "Rail + split (alvo)" },
  { key: "B", label: "Pedido em foco" },
  { key: "A", label: "Ops clássico + grade" },
];

function PrototypeInner() {
  const searchParams = useSearchParams();
  const variant = (searchParams.get("variant") ?? "C").toUpperCase();
  const { screen, filter, orders, captureSeries, cadastroTab, notifOpen } =
    usePrototypeState();

  return (
    <div className="font-sans antialiased [--font-heading:var(--font-sans)]">
      {variant === "A" ? <VariantA /> : null}
      {variant === "B" ? <VariantB /> : null}
      {variant !== "A" && variant !== "B" ? <VariantC /> : null}
      <PrototypeSwitcher variants={VARIANTS} />
      <Toaster
        position="top-center"
        closeButton
        toastOptions={{
          classNames: {
            toast: "font-sans rounded-2xl border shadow-lg",
            title: "font-sans text-sm font-semibold",
            description: "font-sans text-xs",
          },
        }}
      />
      <pre className="pointer-events-none fixed left-2 top-16 z-[90] max-w-[14rem] overflow-auto rounded-lg bg-black/80 p-2 font-mono text-[9px] text-lime-300 md:top-2">
        {JSON.stringify(
          {
            variant,
            screen,
            filter,
            orders: orders.length,
            captures: captureSeries.length,
            cadastroTab,
            notifOpen,
            rev: 3,
          },
          null,
          0,
        )}
      </pre>
    </div>
  );
}

export default function AdminOpsUxPrototypePage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 font-sans text-sm">Carregando protótipo…</div>
      }
    >
      <PrototypeStateProvider>
        <PrototypeInner />
      </PrototypeStateProvider>
    </Suspense>
  );
}
