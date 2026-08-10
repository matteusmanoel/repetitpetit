"use client";

/**
 * PROTOTYPE — AI intake recording checklist (rev.2)
 * Question: how should the memory checklist stay visible during Gravando?
 *
 * Three layouts (same session shell C + preview edit):
 * A — Dock + pulse mic no centro da foto (alvo)
 * B — Split foto/lista
 * C — Checklist-first (foto → thumbnail)
 *
 * Rule: checklist does NOT disappear when recording starts.
 * Default: A
 */

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

import {
  PrototypeSwitcher,
  type PrototypeVariantMeta,
} from "@/components/prototype/PrototypeSwitcher";

import { PrototypeStateProvider } from "./prototype-state";
import {
  VariantA,
  VariantB,
  VariantC,
  VARIANT_A_META,
  VARIANT_B_META,
  VARIANT_C_META,
} from "./variants/VariantC";

const VARIANTS: PrototypeVariantMeta[] = [
  VARIANT_A_META,
  VARIANT_B_META,
  VARIANT_C_META,
];

function PrototypeInner() {
  const searchParams = useSearchParams();
  const raw = (searchParams.get("variant") ?? "A").toUpperCase();
  const variant = raw === "B" || raw === "C" ? raw : "A";

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
