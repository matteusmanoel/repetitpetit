import type { Metadata } from "next";
import Link from "next/link";

import { AdminDashboardKpis } from "@/components/admin/AdminDashboardKpis";
import { getAdminDashboardKpis } from "@/features/admin/dashboard/queries";

export const metadata: Metadata = {
  title: "Painel administrativo — Repeti Petit",
};

const SHORTCUTS = [
  {
    href: "/admin/pedidos",
    title: "Pedidos",
    description: "Fila de fulfillment em tempo real — pedidos pagos para conferir.",
  },
  {
    href: "/admin/produtos",
    title: "Produtos",
    description: "Cadastre, edite, desative ou importe o acervo via XLSX.",
  },
  {
    href: "/admin/categorias",
    title: "Categorias",
    description: "Gerencie as categorias da vitrine e da home.",
  },
  {
    href: "/admin/banners",
    title: "Banners",
    description: "Controle os banners ativos na página inicial.",
  },
] as const;

export default async function AdminDashboardPage() {
  const kpis = await getAdminDashboardKpis();

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-2xl font-extrabold text-foreground">
          Painel administrativo
        </h1>
        <p className="text-sm text-muted-foreground">
          Visão do acervo e da fila de fulfillment. Use os atalhos para
          gerenciar catálogo, categorias e banners.
        </p>
      </div>

      <AdminDashboardKpis kpis={kpis} />

      <section className="flex flex-col gap-3" aria-labelledby="atalhos-admin">
        <h2
          id="atalhos-admin"
          className="font-heading text-base font-extrabold text-foreground"
        >
          Atalhos
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {SHORTCUTS.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="block rounded-lg border border-border bg-card px-4 py-4 transition-colors hover:border-primary/40 hover:bg-muted/40"
              >
                <p className="font-heading text-base font-extrabold text-foreground">
                  {item.title}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {item.description}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
