"use client";

import { Heart, MapPin, Menu, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { AccountPopover } from "@/components/public/account-popover";
import { MobileNavDrawer } from "@/components/public/mobile-nav-drawer";
import { StorefrontSearch } from "@/components/public/storefront-search";
import { BrandLogo } from "@/components/shared/BrandEmptyState";
import { useCartStore } from "@/features/cart/store";
import { navToneClass, STOREFRONT_NAV } from "@/features/storefront/nav";

/**
 * TipTop→Repeti header (D112): logo, busca pill + autocomplete (SS-2),
 * Conta popover, categorias texto+Lucide centradas, hamburger mobile.
 *
 * Mobile: menu | logo centrada | sacolinha (mesma altura); busca abaixo.
 * Desktop: logo à esquerda; search + utilitários; categorias sob a search.
 */
export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const openCart = useCartStore((s) => s.openCart);
  const itemCount = useCartStore((s) => s.items.length);
  const hasHydrated = useCartStore((s) => s.hasHydrated);
  const count = hasHydrated ? itemCount : 0;

  const cartLabel =
    count > 0
      ? `Abrir sacolinha, ${count} ${count === 1 ? "peça" : "peças"}`
      : "Abrir sacolinha";

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-border bg-card">
        {/* Mobile top bar — logo in-flow (não absoluta) para não invadir a busca */}
        <div className="mx-auto grid max-w-6xl grid-cols-[2.75rem_1fr_2.75rem] items-center gap-2 px-4 py-2 sm:hidden">
          <button
            type="button"
            className="flex size-11 cursor-pointer items-center justify-center text-primary"
            aria-label="Abrir menu"
            onClick={() => setMenuOpen(true)}
          >
            <Menu className="size-7" strokeWidth={1.75} />
          </button>

          <Link
            href="/"
            aria-label="Repeti Petit — página inicial"
            className="justify-self-center"
          >
            <BrandLogo
              priority
              className="!h-auto w-[min(132px,46vw)] max-w-[132px]"
            />
          </Link>

          <button
            type="button"
            onClick={openCart}
            className="relative flex size-11 cursor-pointer items-center justify-center justify-self-end rounded-full bg-primary/10 text-primary"
            aria-label={cartLabel}
          >
            <ShoppingBag className="size-5" />
            {count > 0 ? (
              <span className="absolute -right-0.5 -top-0.5 flex size-5 items-center justify-center rounded-full bg-destructive text-[11px] font-bold text-destructive-foreground">
                {count > 9 ? "9+" : count}
              </span>
            ) : null}
          </button>
        </div>

        <StorefrontSearch
          variant="mobile"
          className="px-4 pb-3 sm:hidden"
        />

        {/* sm+: logo + search (+ nav no md) */}
        <div className="mx-auto hidden max-w-6xl items-end gap-5 px-4 py-2.5 sm:flex">
          <Link
            href="/"
            aria-label="Repeti Petit — página inicial"
            className="shrink-0 self-end transition hover:-translate-y-0.5"
          >
            <BrandLogo
              priority
              className="!h-auto w-[min(148px,42vw)] max-w-[148px]"
            />
          </Link>

          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <div className="flex items-center gap-3 lg:gap-5">
              <StorefrontSearch
                variant="desktop"
                className="min-w-0 flex-1"
              />

              <div className="ml-auto hidden shrink-0 items-center gap-1 md:flex lg:gap-2">
                <a
                  href="https://maps.google.com/?q=Av.+Rep%C3%BAblica+Argentina,+2554,+Foz+do+Igua%C3%A7u"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-primary transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <MapPin className="size-6" strokeWidth={1.75} />
                  Nossa loja
                </a>
                <span className="h-8 w-px bg-border" aria-hidden />
                <AccountPopover />
                <span
                  className="flex flex-col items-center gap-1 rounded-xl px-2 py-1 text-primary opacity-40"
                  title="Em breve"
                  aria-hidden
                >
                  <Heart className="size-6 md:size-7" strokeWidth={1.75} />
                </span>
                <button
                  type="button"
                  onClick={openCart}
                  className="relative flex cursor-pointer flex-col items-center gap-1 rounded-xl px-2 py-1 text-primary transition hover:-translate-y-0.5 hover:shadow-md"
                  aria-label={cartLabel}
                >
                  <ShoppingBag
                    className="size-6 md:size-7"
                    strokeWidth={1.75}
                  />
                  {count > 0 ? (
                    <span className="absolute -right-0.5 -top-0.5 flex size-5 items-center justify-center rounded-full bg-destructive text-[11px] font-bold text-destructive-foreground">
                      {count > 9 ? "9+" : count}
                    </span>
                  ) : null}
                </button>
              </div>
            </div>

            <nav
              aria-label="Categorias"
              className="hidden justify-center gap-5 overflow-x-auto md:flex lg:gap-8"
            >
              {STOREFRONT_NAV.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`group flex cursor-pointer flex-col items-center gap-1 rounded-2xl px-1.5 py-1 transition hover:-translate-y-1 hover:shadow-lg ${navToneClass(item.tone)}`}
                  >
                    <Icon
                      className="size-6 transition group-hover:scale-110 lg:size-7"
                      strokeWidth={1.6}
                    />
                    <span className="text-center text-xs font-semibold lg:text-sm">
                      {item.name}
                    </span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </header>

      <MobileNavDrawer open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}
