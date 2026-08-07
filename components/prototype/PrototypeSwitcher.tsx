"use client";

/**
 * PROTOTYPE ONLY — floating variant switcher (docs/slice-o, skill prototype/UI).
 * Hidden in production builds.
 */

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export type PrototypeVariantMeta = {
  key: string;
  label: string;
};

type PrototypeSwitcherProps = {
  variants: PrototypeVariantMeta[];
  param?: string;
};

export function PrototypeSwitcher({
  variants,
  param = "variant",
}: PrototypeSwitcherProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isProd = process.env.NODE_ENV === "production";

  const currentKey = searchParams.get(param) ?? variants[0]?.key ?? "A";
  const index = Math.max(
    0,
    variants.findIndex((v) => v.key === currentKey),
  );
  const current = variants[index] ?? variants[0];

  const go = useCallback(
    (nextIndex: number) => {
      const wrapped = (nextIndex + variants.length) % variants.length;
      const next = variants[wrapped];
      if (!next) return;
      const params = new URLSearchParams(searchParams.toString());
      params.set(param, next.key);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [variants, searchParams, param, pathname, router],
  );

  useEffect(() => {
    if (isProd) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.tagName === "INPUT" ||
          t.tagName === "TEXTAREA" ||
          t.isContentEditable)
      ) {
        return;
      }
      if (e.key === "ArrowLeft") go(index - 1);
      if (e.key === "ArrowRight") go(index + 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, index, isProd]);

  if (isProd) {
    return null;
  }

  return (
    <div
      className="fixed bottom-4 left-1/2 z-[100] flex -translate-x-1/2 items-center gap-2 rounded-full border-2 border-black bg-black px-2 py-1.5 text-white shadow-xl"
      role="group"
      aria-label="Seletor de variante do protótipo"
    >
      <button
        type="button"
        className="rounded-full p-2 hover:bg-white/15"
        aria-label="Variante anterior"
        onClick={() => go(index - 1)}
      >
        <ChevronLeft className="size-5" />
      </button>
      <span className="min-w-[11rem] text-center text-xs font-semibold tracking-wide">
        {current?.key} — {current?.label}
      </span>
      <button
        type="button"
        className="rounded-full p-2 hover:bg-white/15"
        aria-label="Próxima variante"
        onClick={() => go(index + 1)}
      >
        <ChevronRight className="size-5" />
      </button>
    </div>
  );
}
