import type { Metadata } from "next";

import { AdminDashboardCharts } from "@/components/admin/AdminDashboardCharts";
import { AdminDashboardOpsSummary } from "@/components/admin/AdminDashboardOpsSummary";
import { AdminDashboardStockCard } from "@/components/admin/AdminDashboardStockCard";
import { getAdminDashboardData } from "@/features/admin/dashboard/queries";

export const metadata: Metadata = {
  title: "Painel — Repeti Petit",
};

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

      <AdminDashboardStockCard
        quantity={kpis.productsAvailable}
        value={kpis.productsAvailableValue}
      />

      <AdminDashboardOpsSummary kpis={kpis} />

      <AdminDashboardCharts charts={charts} />
    </div>
  );
}
