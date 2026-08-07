"use client";

import { X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const MENU_LINKS = [
  { href: "/catalogo", label: "Catálogo" },
  { href: "/desapegue", label: "Desapegue" },
  { href: "/sobre", label: "Sobre nós / FAQ" },
  { href: "/privacidade", label: "Privacidade" },
  { href: "/termos", label: "Termos de uso" },
] as const;

type MobileNavDrawerProps = {
  open: boolean;
  onClose: () => void;
};

/**
 * Hamburger drawer — Desapegue, Sobre/Legal e demais links fora da BottomBar.
 */
export function MobileNavDrawer({ open, onClose }: MobileNavDrawerProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Fechar menu"
        onClick={onClose}
      />
      <aside className="absolute left-0 top-0 flex h-full w-[82%] max-w-sm flex-col bg-card p-5 shadow-2xl">
        <div className="mb-6 flex items-center justify-between">
          <Image
            src="/brand/logo.png"
            alt="Repeti Petit"
            width={110}
            height={36}
            className="h-9 w-auto"
          />
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer text-primary"
            aria-label="Fechar"
          >
            <X className="size-6" />
          </button>
        </div>
        <ul className="space-y-1 text-base font-semibold text-foreground">
          {MENU_LINKS.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                onClick={onClose}
                className="block w-full cursor-pointer rounded-xl px-3 py-3 text-left transition hover:bg-primary/10 hover:text-primary"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
