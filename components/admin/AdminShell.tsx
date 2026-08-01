import type { ReactNode } from "react";

import { AdminNav } from "@/components/admin/AdminNav";
import { SignOutButton } from "@/components/admin/SignOutButton";
import type { AdminRow } from "@/features/admin/session";

/**
 * Shell autenticado do admin — header com identidade + nav + sign-out.
 * Badge de "Pedidos" vive em `AdminNav` (client) via FulfillmentQueueProvider.
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
        <AdminNav />
      </header>

      <main className="flex-1 px-4 py-6 sm:px-8">{children}</main>
    </div>
  );
}
