import type { ReactNode } from "react";

import { AdminChrome } from "@/components/admin/AdminChrome";
import { Toaster } from "@/components/ui/sonner";
import type { AdminRow } from "@/features/admin/session";

/**
 * Shell autenticado do admin — Variant C (D121 / Slice P SP-1).
 * Canvas cinza ops (`#eceff3`); brand na rail azul. Nav: AdminChrome
 * (rail hover desktop · bottom bar + hamburger mobile).
 * Badge paid: FulfillmentQueueProvider → Separação.
 * `.admin-shell` (globals.css) tipografia Inter 600 — ferramenta, não loja.
 */
export function AdminShell({
  admin,
  children,
}: {
  admin: AdminRow;
  children: ReactNode;
}) {
  return (
    <div className="admin-shell min-h-screen bg-[#eceff3] font-sans antialiased">
      <AdminChrome admin={admin}>{children}</AdminChrome>
      <Toaster position="top-center" richColors closeButton />
    </div>
  );
}
