"use client";

/**
 * PROTOTYPE — AI intake UX (cadastro em massa)
 * Three variants switchable via ?variant=
 *
 * VERDICT (2026-08-09): C + Preview editável de B
 *   → sessão fullscreen (lobby → camera → record → confirm → preview edit → próxima)
 *   → Cancelar/Finalizar com confirm; shell padrão só fora da sessão
 *
 * A — Throughput (fila) — descartada para produto
 * B — Ciclo + preview edit — só o preview edit entra no vencedor
 * C — App fullscreen + edit B — alvo de implementação
 */

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

import {
  PrototypeSwitcher,
  type PrototypeVariantMeta,
} from "@/components/prototype/PrototypeSwitcher";

import { PrototypeStateProvider } from "./prototype-state";
import { VariantA, VARIANT_A_META } from "./variants/VariantA";
import { VariantB, VARIANT_B_META } from "./variants/VariantB";
import { VariantC, VARIANT_C_META } from "./variants/VariantC";

const VARIANTS: PrototypeVariantMeta[] = [
  VARIANT_A_META,
  VARIANT_B_META,
  VARIANT_C_META,
];

function PrototypeInner() {
  const searchParams = useSearchParams();
  const raw = (searchParams.get("variant") ?? "C").toUpperCase();
  const variant = raw === "A" || raw === "B" ? raw : "C";

  return (
    <PrototypeStateProvider key={variant}>
      {variant === "A" ? <VariantA /> : null}
      {variant === "B" ? <VariantB /> : null}
      {variant === "C" ? <VariantC /> : null}
      <PrototypeSwitcher variants={VARIANTS} />
    </PrototypeStateProvider>
  );
}

export default function AiIntakeUxPrototypePage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 font-sans text-sm">Carregando protótipo…</div>
      }
    >
      <PrototypeInner />
    </Suspense>
  );
}
