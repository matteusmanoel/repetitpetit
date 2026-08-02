import type { ReactNode } from "react";

import { AdminNav } from "@/components/admin/AdminNav";
import { SignOutButton } from "@/components/admin/SignOutButton";
import { Toaster } from "@/components/ui/sonner";
import type { AdminRow } from "@/features/admin/session";

/**
 * Shell autenticado do admin — header com identidade + nav + sign-out.
 * Badge de "Pedidos" vive em `AdminNav` (client) via FulfillmentQueueProvider.
 * `.admin-shell` (globals.css, T8) troca a tipografia de títulos para Inter
 * 600 — sem Nunito/lima/coral lúdicos, identidade de ferramenta.
 */
export function AdminShell({
  admin,
  children,
}: {
  admin: AdminRow;
  children: ReactNode;
}) {
  return (
    <div className="admin-shell flex min-h-screen flex-col font-sans">
      <header className="border-b border-border bg-card">
        <div className="flex items-center justify-between px-4 py-3 sm:px-8">
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-foreground">
              Repeti Petit · Admin
            </span>
            <span className="text-xs text-muted-foreground">
              {admin.full_name ?? admin.email}
            </span>
          </div>
          <SignOutButton />
        </div>
        <AdminNav />
      </header>

      <main className="flex-1 px-4 py-6 sm:px-8">{children}</main>
      <Toaster position="top-center" richColors closeButton />
    </div>
  );
}
