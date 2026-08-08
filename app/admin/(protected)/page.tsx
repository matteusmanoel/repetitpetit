import type { Metadata } from "next";
import Link from "next/link";

import { AdminDashboardCharts } from "@/components/admin/AdminDashboardCharts";
import { AdminDashboardKpis } from "@/components/admin/AdminDashboardKpis";
import { AdminDashboardOpsSummary } from "@/components/admin/AdminDashboardOpsSummary";
import { getAdminDashboardData } from "@/features/admin/dashboard/queries";

export const metadata: Metadata = {
  title: "Painel — Repeti Petit",
};

const SHORTCUTS = [
  {
    href: "/admin/pedidos",
    title: "Separação",
    description: "Fila de fulfillment — pedidos pagos para conferir.",
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
  const { kpis, charts } = await getAdminDashboardData();

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 pb-4">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Painel
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Operação do dia · vendas por canal · holds e Sacolinha
        </p>
      </header>

      <AdminDashboardOpsSummary kpis={kpis} />

      <AdminDashboardCharts charts={charts} />

      <AdminDashboardKpis kpis={kpis} />

      <section className="flex flex-col gap-3" aria-labelledby="atalhos-admin">
        <h2
          id="atalhos-admin"
          className="text-base font-semibold text-foreground"
        >
          Atalhos
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {SHORTCUTS.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="block rounded-2xl border border-black/5 bg-white px-4 py-4 shadow-sm transition-colors hover:border-primary/40 hover:bg-muted/40"
              >
                <p className="text-base font-semibold text-foreground">
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
