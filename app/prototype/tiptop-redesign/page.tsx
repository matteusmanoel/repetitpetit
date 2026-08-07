"use client";

/**
 * PROTOTYPE — TipTop→Repeti redesign variants.
 * Default T = TipTop hard-copy target (Omnes/Becca stand-ins, Repeti colors).
 * A/B/C kept for comparison. Do not promote to production.
 */

import { Suspense, useCallback, useState } from "react";
import { useSearchParams } from "next/navigation";

import {
  PrototypeSwitcher,
  type PrototypeVariantMeta,
} from "@/components/prototype/PrototypeSwitcher";

import type { ScreenId } from "./mock-data";
import { VariantA } from "./variants/VariantA";
import { VariantB } from "./variants/VariantB";
import { VariantC } from "./variants/VariantC";
import { VariantT } from "./variants/VariantT";

const VARIANTS: PrototypeVariantMeta[] = [
  { key: "T", label: "TipTop target" },
  { key: "A", label: "Dense commerce" },
  { key: "B", label: "Soft kids (mobile)" },
  { key: "C", label: "Fluid editorial" },
];

function PrototypeInner() {
  const searchParams = useSearchParams();
  const variant = (searchParams.get("variant") ?? "T").toUpperCase();
  const [screen, setScreen] = useState<ScreenId>("home");
  const onScreen = useCallback((id: ScreenId) => setScreen(id), []);

  return (
    <>
      {variant === "A" && <VariantA screen={screen} onScreen={onScreen} />}
      {variant === "B" && <VariantB screen={screen} onScreen={onScreen} />}
      {variant === "C" && <VariantC screen={screen} onScreen={onScreen} />}
      {variant !== "A" && variant !== "B" && variant !== "C" && (
        <VariantT screen={screen} onScreen={onScreen} />
      )}
      <PrototypeSwitcher variants={VARIANTS} />
      <pre className="fixed left-2 top-2 z-[90] max-w-[16rem] overflow-auto rounded bg-black/80 p-2 font-mono text-[9px] text-lime-300">
        {JSON.stringify(
          {
            variant,
            screen,
            fonts: "Omnes→Fredoka · Becca→Caveat",
            prototype: true,
          },
          null,
          0,
        )}
      </pre>
    </>
  );
}

export default function TipTopRedesignPrototypePage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm">Carregando protótipo…</div>}>
      <PrototypeInner />
    </Suspense>
  );
}
