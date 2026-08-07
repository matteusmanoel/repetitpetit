"use client";

import { User } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { useCartStore } from "@/features/cart/store";
import { cn } from "@/lib/utils";

/**
 * Conta popover (D112) — visitor greeting + placeholders until SO-03 magic link.
 */
export function AccountPopover({
  className,
  showLabel = true,
}: {
  className?: string;
  showLabel?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const openCart = useCartStore((s) => s.openCart);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex cursor-pointer flex-col items-center gap-1 rounded-xl px-2 py-1 text-primary transition hover:-translate-y-0.5 hover:shadow-md"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label="Conta"
      >
        <User className="size-6 md:size-7" strokeWidth={1.75} />
        {showLabel ? (
          <span className="hidden text-[11px] font-semibold lg:block">Conta</span>
        ) : null}
      </button>
      {open ? (
        <div
          role="dialog"
          aria-label="Menu da conta"
          className="absolute right-0 top-full z-40 mt-2 w-52 rounded-2xl border border-border bg-card p-3 shadow-xl"
        >
          <p className="text-sm font-bold text-foreground">Olá, visitante</p>
          <ul className="mt-2 space-y-2 text-sm text-foreground/80">
            <li>
              <span className="block cursor-default text-muted-foreground">
                Meus pedidos
                <span className="ml-1 text-[10px] uppercase tracking-wide">
                  em breve
                </span>
              </span>
            </li>
            <li>
              <button
                type="button"
                className="cursor-pointer hover:text-primary"
                onClick={() => {
                  setOpen(false);
                  openCart();
                }}
              >
                Minha Sacolinha
              </button>
            </li>
            <li>
              <Link
                href="/sobre"
                className="cursor-pointer hover:text-primary"
                onClick={() => setOpen(false)}
              >
                Sobre / FAQ
              </Link>
            </li>
            <li>
              <span className="block cursor-default text-muted-foreground">
                Entrar
                <span className="ml-1 text-[10px] uppercase tracking-wide">
                  em breve
                </span>
              </span>
            </li>
          </ul>
        </div>
      ) : null}
    </div>
  );
}
