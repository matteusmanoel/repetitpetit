"use client";

import { House, LayoutGrid, ShoppingBag, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { useCartStore } from "@/features/cart/store";
import { cn } from "@/lib/utils";

/**
 * BottomBar mobile (D112): Home · Catálogo · Sacolinha · Conta.
 * Hidden while cart sheet is open (fullscreen cart).
 */
export function BottomBar() {
  const pathname = usePathname() ?? "/";
  const openCart = useCartStore((s) => s.openCart);
  const isCartOpen = useCartStore((s) => s.isOpen);
  const itemCount = useCartStore((s) => s.items.length);
  const hasHydrated = useCartStore((s) => s.hasHydrated);
  const count = hasHydrated ? itemCount : 0;
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!accountOpen) return;
    function onPointerDown(event: MouseEvent) {
      if (!accountRef.current?.contains(event.target as Node)) {
        setAccountOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [accountOpen]);

  if (isCartOpen) return null;

  const homeActive = pathname === "/";
  const catalogActive =
    pathname.startsWith("/catalogo") || pathname.startsWith("/produto");
  const cartActive = pathname.startsWith("/checkout");
  const accountActive =
    pathname.startsWith("/sobre") ||
    pathname.startsWith("/entrar") ||
    pathname.startsWith("/sacolinha");

  return (
    <nav
      aria-label="Navegação inferior"
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card/95 px-2 pb-[env(safe-area-inset-bottom)] pt-1 backdrop-blur md:hidden"
    >
      <div className="mx-auto flex max-w-lg items-stretch justify-around">
        <Link
          href="/"
          className={cn(
            "relative flex min-w-[4.5rem] cursor-pointer flex-col items-center gap-0.5 rounded-xl px-2 py-2 text-[11px] font-semibold transition hover:-translate-y-0.5",
            homeActive ? "text-primary" : "text-foreground/55",
          )}
        >
          <House className="size-6" strokeWidth={homeActive ? 2.2 : 1.75} />
          Home
        </Link>

        <Link
          href="/catalogo"
          className={cn(
            "relative flex min-w-[4.5rem] cursor-pointer flex-col items-center gap-0.5 rounded-xl px-2 py-2 text-[11px] font-semibold transition hover:-translate-y-0.5",
            catalogActive ? "text-primary" : "text-foreground/55",
          )}
        >
          <LayoutGrid
            className="size-6"
            strokeWidth={catalogActive ? 2.2 : 1.75}
          />
          Catálogo
        </Link>

        <button
          type="button"
          onClick={openCart}
          className={cn(
            "relative flex min-w-[4.5rem] cursor-pointer flex-col items-center gap-0.5 rounded-xl px-2 py-2 text-[11px] font-semibold transition hover:-translate-y-0.5",
            cartActive ? "text-primary" : "text-foreground/55",
          )}
        >
          <ShoppingBag
            className="size-6"
            strokeWidth={cartActive ? 2.2 : 1.75}
          />
          {count > 0 ? (
            <span className="absolute right-2 top-1 flex size-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground">
              {count > 9 ? "9+" : count}
            </span>
          ) : null}
          Sacolinha
        </button>

        <div ref={accountRef} className="relative">
          <button
            type="button"
            onClick={() => setAccountOpen((v) => !v)}
            className={cn(
              "relative flex min-w-[4.5rem] cursor-pointer flex-col items-center gap-0.5 rounded-xl px-2 py-2 text-[11px] font-semibold transition hover:-translate-y-0.5",
              accountActive || accountOpen
                ? "text-primary"
                : "text-foreground/55",
            )}
            aria-expanded={accountOpen}
          >
            <User
              className="size-6"
              strokeWidth={accountActive || accountOpen ? 2.2 : 1.75}
            />
            Conta
          </button>
          {accountOpen ? (
            <div
              role="dialog"
              aria-label="Menu da conta"
              className="absolute bottom-full right-0 z-50 mb-2 w-52 rounded-2xl border border-border bg-card p-3 shadow-xl"
            >
              <p className="text-sm font-bold text-foreground">Olá!</p>
              <ul className="mt-2 space-y-2 text-sm text-foreground/80">
                <li>
                  <Link
                    href="/sacolinha"
                    className="cursor-pointer hover:text-primary"
                    onClick={() => setAccountOpen(false)}
                  >
                    Minha Sacolinha
                  </Link>
                </li>
                <li>
                  <Link
                    href="/sobre"
                    className="cursor-pointer hover:text-primary"
                    onClick={() => setAccountOpen(false)}
                  >
                    Sobre / FAQ
                  </Link>
                </li>
                <li>
                  <Link
                    href="/entrar"
                    className="cursor-pointer hover:text-primary"
                    onClick={() => setAccountOpen(false)}
                  >
                    Entrar
                  </Link>
                </li>
              </ul>
            </div>
          ) : null}
        </div>
      </div>
    </nav>
  );
}
