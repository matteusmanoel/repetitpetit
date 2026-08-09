"use client";

import { User } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

/**
 * Conta popover (D112 + SO-03): Entrar (magic link) + Minha Sacolinha panel.
 * Carrinho permanece no ícone Sacolinha do header/bottom bar.
 */
export function AccountPopover({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

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
        className="flex cursor-pointer items-center justify-center rounded-xl px-2 py-1 text-primary transition hover:-translate-y-0.5 hover:shadow-md"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label="Conta"
      >
        <User className="size-6 md:size-7" strokeWidth={1.75} />
      </button>
      {open ? (
        <div
          role="dialog"
          aria-label="Menu da conta"
          className="absolute right-0 top-full z-40 mt-2 w-52 rounded-2xl border border-border bg-card p-3 shadow-xl"
        >
          <p className="text-sm font-bold text-foreground">Olá!</p>
          <ul className="mt-2 space-y-2 text-sm text-foreground/80">
            <li>
              <Link
                href="/sacolinha"
                className="cursor-pointer hover:text-primary"
                onClick={() => setOpen(false)}
              >
                Minha Sacolinha
              </Link>
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
              <Link
                href="/entrar"
                className="cursor-pointer hover:text-primary"
                onClick={() => setOpen(false)}
              >
                Entrar
              </Link>
            </li>
          </ul>
        </div>
      ) : null}
    </div>
  );
}
