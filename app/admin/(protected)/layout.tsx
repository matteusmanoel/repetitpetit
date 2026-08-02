import type { ReactNode } from "react";

import { AdminShell } from "@/components/admin/AdminShell";
import { FulfillmentQueueProvider } from "@/components/admin/FulfillmentQueueProvider";
import {
  getInProgressFulfillmentQueue,
  getPaidFulfillmentQueue,
} from "@/features/admin/fulfillment/queries";
import { requireAdminSession } from "@/features/admin/session";

/**
 * Layout do grupo de rotas `(protected)` — todo o admin exceto `/admin/login`.
 * `requireAdminSession()` redireciona para `/admin/login` sem sessão válida.
 * Filas paid + em progresso carregadas aqui para badge/nav e `/admin/pedidos`.
 */
export default async function ProtectedAdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await requireAdminSession();
  const [initialOrders, initialInProgressOrders] = await Promise.all([
    getPaidFulfillmentQueue(),
    getInProgressFulfillmentQueue(),
  ]);

  return (
    <FulfillmentQueueProvider
      initialOrders={initialOrders}
      initialInProgressOrders={initialInProgressOrders}
    >
      <AdminShell admin={session.admin}>{children}</AdminShell>
    </FulfillmentQueueProvider>
  );
}
