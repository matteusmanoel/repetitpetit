"use client";

/**
 * PROTOTYPE — AI intake **preview** UX
 * Question: how to review/edit/validate fast without dominant photo, tabs, or Select scroll hell?
 *
 * A — Form-first strip (thumb + free scroll + chips + série prev/next)
 * B — Checklist gate (essentials first, details on demand)
 * C — Filmstrip + sheet (capped photo, natural form scroll)
 *
 * Throwaway. Run: pnpm dev → /prototype/ai-intake-preview?variant=A
 */

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

import {
  PrototypeSwitcher,
  type PrototypeVariantMeta,
} from "@/components/prototype/PrototypeSwitcher";

import { VariantA, VARIANT_A_META } from "./variants/VariantA";
import { VariantB, VARIANT_B_META } from "./variants/VariantB";
import { VariantC, VARIANT_C_META } from "./variants/VariantC";

const VARIANTS: PrototypeVariantMeta[] = [
  VARIANT_A_META,
  VARIANT_B_META,
  VARIANT_C_META,
];

function Inner() {
  const searchParams = useSearchParams();
  const raw = (searchParams.get("variant") ?? "A").toUpperCase();
  const variant = raw === "B" || raw === "C" ? raw : "A";

  return (
    <>
      {variant === "A" ? <VariantA /> : null}
      {variant === "B" ? <VariantB /> : null}
      {variant === "C" ? <VariantC /> : null}
      <PrototypeSwitcher variants={VARIANTS} />
    </>
  );
}

export default function AiIntakePreviewPrototypePage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 font-sans text-sm">Carregando protótipo…</div>
      }
    >
      <Inner />
    </Suspense>
  );
}
