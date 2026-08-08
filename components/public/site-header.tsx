"use client";

import { Heart, MapPin, Menu, Search, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { AccountPopover } from "@/components/public/account-popover";
import { MobileNavDrawer } from "@/components/public/mobile-nav-drawer";
import { BrandLogo } from "@/components/shared/BrandEmptyState";
import { useCartStore } from "@/features/cart/store";
import { navToneClass, STOREFRONT_NAV } from "@/features/storefront/nav";

/**
 * TipTop→Repeti header (D112): logo, busca pill, Conta popover,
 * categorias texto+Lucide centradas, hamburger mobile.
 */
export function SiteHeader() {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState("");
  const openCart = useCartStore((s) => s.openCart);
  const itemCount = useCartStore((s) => s.items.length);
  const hasHydrated = useCartStore((s) => s.hasHydrated);
  const count = hasHydrated ? itemCount : 0;

  function handleSearch(event: FormEvent) {
    event.preventDefault();
    // Full-text search is out of D0 — pill chrome navigates to catalog.
    void query;
    router.push("/catalogo");
  }

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 md:gap-5 md:py-4">
          <button
            type="button"
            className="cursor-pointer text-primary transition hover:-translate-y-0.5 md:hidden"
            aria-label="Abrir menu"
            onClick={() => setMenuOpen(true)}
          >
            <Menu className="size-7" strokeWidth={1.75} />
          </button>

          <Link
            href="/"
            aria-label="Repeti Petit — página inicial"
            className="shrink-0 transition hover:-translate-y-0.5"
          >
            <BrandLogo
              priority
              className="!h-auto w-[min(240px,55vw)] max-w-[240px]"
            />
          </Link>

          <form
            onSubmit={handleSearch}
            className="relative hidden min-w-0 flex-1 items-center sm:flex"
          >
            <label className="sr-only" htmlFor="storefront-search">
              Buscar
            </label>
            <input
              id="storefront-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="O que você procura?"
              className="h-12 w-full rounded-full border-2 border-primary/50 bg-card px-5 pr-12 text-base text-foreground placeholder:text-foreground/40 md:h-[3.25rem] md:text-lg"
            />
            <button
              type="submit"
              className="absolute right-3 flex size-9 items-center justify-center rounded-full text-primary transition hover:bg-primary/10"
              aria-label="Buscar"
            >
              <Search className="size-5" />
            </button>
          </form>

          <div className="ml-auto hidden items-center gap-1 md:flex lg:gap-2">
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
              aria-label={
                count > 0
                  ? `Abrir sacolinha, ${count} ${count === 1 ? "peça" : "peças"}`
                  : "Abrir sacolinha"
              }
            >
              <ShoppingBag className="size-6 md:size-7" strokeWidth={1.75} />
              {count > 0 ? (
                <span className="absolute -right-0.5 -top-0.5 flex size-5 items-center justify-center rounded-full bg-destructive text-[11px] font-bold text-destructive-foreground">
                  {count > 9 ? "9+" : count}
                </span>
              ) : null}
            </button>
          </div>

          <button
            type="button"
            onClick={openCart}
            className="relative ml-auto flex size-11 cursor-pointer items-center justify-center rounded-full bg-primary/10 text-primary transition hover:-translate-y-0.5 hover:shadow-md md:hidden"
            aria-label={
              count > 0
                ? `Abrir sacolinha, ${count} ${count === 1 ? "peça" : "peças"}`
                : "Abrir sacolinha"
            }
          >
            <ShoppingBag className="size-5" />
            {count > 0 ? (
              <span className="absolute -right-0.5 -top-0.5 flex size-5 items-center justify-center rounded-full bg-destructive text-[11px] font-bold text-destructive-foreground">
                {count > 9 ? "9+" : count}
              </span>
            ) : null}
          </button>
        </div>

        <nav
          aria-label="Categorias"
          className="mx-auto hidden max-w-6xl justify-center gap-6 overflow-x-auto px-4 pb-4 pt-1 md:flex lg:gap-10"
        >
          {STOREFRONT_NAV.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`group flex cursor-pointer flex-col items-center gap-1.5 rounded-2xl px-2 py-2 transition hover:-translate-y-1 hover:shadow-lg ${navToneClass(item.tone)}`}
              >
                <Icon
                  className="size-7 transition group-hover:scale-110 lg:size-8"
                  strokeWidth={1.6}
                />
                <span className="text-center text-sm font-semibold lg:text-base">
                  {item.name}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Mobile search under logo row */}
        <form
          onSubmit={handleSearch}
          className="relative px-4 pb-3 sm:hidden"
        >
          <label className="sr-only" htmlFor="storefront-search-mobile">
            Buscar
          </label>
          <input
            id="storefront-search-mobile"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="O que você procura?"
            className="h-11 w-full rounded-full border-2 border-primary/50 bg-card px-5 pr-12 text-base text-foreground placeholder:text-foreground/40"
          />
          <button
            type="submit"
            className="absolute right-6 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center text-primary"
            aria-label="Buscar"
          >
            <Search className="size-5" />
          </button>
        </form>
      </header>

      <MobileNavDrawer open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}
