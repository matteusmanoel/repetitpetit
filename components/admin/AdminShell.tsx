import type { ReactNode } from "react";
import Link from "next/link";

import { SignOutButton } from "@/components/admin/SignOutButton";
import type { AdminRow } from "@/features/admin/session";

const NAV_ITEMS = [
  { href: "/admin", label: "Painel" },
  { href: "/admin/produtos", label: "Produtos" },
] as const;

/**
 * Shell autenticado do admin — header com identidade, nav básica e sign-out.
 */
export function AdminShell({
  admin,
  children,
}: {
  admin: AdminRow;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border bg-card">
        <div className="flex items-center justify-between px-4 py-3 sm:px-8">
          <div className="flex flex-col">
            <span className="font-heading text-sm font-extrabold text-foreground">
              Repeti Petit · Admin
            </span>
            <span className="text-xs text-muted-foreground">
              {admin.full_name ?? admin.email}
            </span>
          </div>
          <SignOutButton />
        </div>
        <nav
          aria-label="Admin"
          className="flex gap-1 overflow-x-auto px-4 pb-2 sm:px-8"
        >
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>

      <main className="flex-1 px-4 py-6 sm:px-8">{children}</main>
    </div>
  );
}
