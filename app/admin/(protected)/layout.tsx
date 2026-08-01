import type { ReactNode } from "react";

import { AdminShell } from "@/components/admin/AdminShell";
import { FulfillmentQueueProvider } from "@/components/admin/FulfillmentQueueProvider";
import { getPaidFulfillmentQueue } from "@/features/admin/fulfillment/queries";
import { requireAdminSession } from "@/features/admin/session";

/**
 * Layout do grupo de rotas `(protected)` — todo o admin exceto `/admin/login`.
 * `requireAdminSession()` redireciona para `/admin/login` sem sessão válida.
 * A fila paid é carregada aqui para badge no nav em qualquer rota admin (T19).
 */
export default async function ProtectedAdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await requireAdminSession();
  const initialOrders = await getPaidFulfillmentQueue();

  return (
    <FulfillmentQueueProvider initialOrders={initialOrders}>
      <AdminShell admin={session.admin}>{children}</AdminShell>
    </FulfillmentQueueProvider>
  );
}
