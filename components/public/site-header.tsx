"use client";

import { Menu, MessageCircle } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { CartTrigger } from "@/features/cart/components/CartTrigger";
import { useCartStore } from "@/features/cart/store";
import { cn } from "@/lib/utils";
import { getWhatsAppUrl } from "@/lib/whatsapp";

const NAV_LINKS = [
  { href: "/catalogo", label: "Catálogo" },
  { href: "/desapegue", label: "Desapegue" },
] as const;

/** Distância de scroll (px) para o header ganhar blur/sombra. */
const SCROLL_THRESHOLD = 8;

export function SiteHeader() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const openCart = useCartStore((s) => s.openCart);
  const whatsapp = process.env.NEXT_PUBLIC_STORE_WHATSAPP;

  useEffect(() => {
    function handleScroll() {
      setScrolled(window.scrollY > SCROLL_THRESHOLD);
    }
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-30 border-b transition-[background-color,box-shadow,border-color] duration-200",
        scrolled
          ? "border-border bg-card/90 shadow-sm backdrop-blur-sm supports-backdrop-filter:bg-card/75"
          : "border-transparent bg-background",
      )}
    >
      <div className="mx-auto flex h-18 max-w-6xl items-center justify-between gap-2 px-4 sm:px-8">
        <Link
          href="/"
          aria-label="Repeti Petit — página inicial"
          className="flex min-h-11 min-w-11 items-center py-1.5 pr-3"
        >
          <Image
            src="/brand/logo.png"
            alt="Repeti Petit"
            width={335}
            height={597}
            priority
            className="h-14 w-auto sm:h-16"
          />
        </Link>

        <nav
          className="hidden items-center gap-2 sm:flex"
          aria-label="Navegação principal"
        >
          {NAV_LINKS.map((link) => (
            <NavLink
              key={link.href}
              href={link.href}
              isActive={pathname?.startsWith(link.href) ?? false}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-0.5">
          <CartTrigger />

          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-11 sm:hidden"
                aria-label="Abrir menu"
              >
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="flex flex-col">
              <SheetHeader>
                <SheetTitle>Repeti Petit</SheetTitle>
              </SheetHeader>
              <nav
                className="flex flex-col gap-1 px-4"
                aria-label="Navegação principal"
              >
                {NAV_LINKS.map((link) => (
                  <SheetClose asChild key={link.href}>
                    <Link
                      href={link.href}
                      className={cn(
                        "flex min-h-11 cursor-pointer items-center rounded-md px-3 text-base font-medium text-foreground transition-colors hover:bg-muted",
                        pathname?.startsWith(link.href) &&
                          "bg-muted text-primary",
                      )}
                    >
                      {link.label}
                    </Link>
                  </SheetClose>
                ))}
                <button
                  type="button"
                  className="flex min-h-11 cursor-pointer items-center rounded-md px-3 text-left text-base font-medium text-foreground transition-colors hover:bg-muted"
                  onClick={() => {
                    setMenuOpen(false);
                    openCart();
                  }}
                >
                  Suas reservas
                </button>
                {whatsapp ? (
                  <a
                    href={getWhatsAppUrl(whatsapp, "Oi, preciso de ajuda!")}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md px-3 text-base font-medium text-foreground transition-colors hover:bg-muted"
                    onClick={() => setMenuOpen(false)}
                  >
                    <MessageCircle className="size-4" aria-hidden />
                    Falar no WhatsApp
                  </a>
                ) : null}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

function NavLink({
  href,
  isActive,
  children,
}: {
  href: string;
  isActive: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "relative flex min-h-11 items-center rounded-md px-3 text-sm font-medium text-foreground/80 transition-colors hover:bg-muted hover:text-foreground",
        isActive && "text-primary",
      )}
    >
      {children}
      {isActive ? (
        <span
          aria-hidden
          className="absolute right-3 bottom-1.5 left-3 h-0.5 rounded-full bg-primary"
        />
      ) : null}
    </Link>
  );
}
