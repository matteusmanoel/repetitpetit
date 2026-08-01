import type { ReactNode } from "react";

import { AdminShell } from "@/components/admin/AdminShell";
import { requireAdminSession } from "@/features/admin/session";

/**
 * Layout do grupo de rotas `(protected)` — todo o admin exceto `/admin/login`.
 * `requireAdminSession()` redireciona para `/admin/login` sem sessão válida;
 * é chamado aqui uma única vez e cobre todas as páginas nested (dashboard,
 * produtos, categorias, etc., conforme forem criadas nos próximos tickets).
 */
export default async function ProtectedAdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await requireAdminSession();

  return <AdminShell admin={session.admin}>{children}</AdminShell>;
}
