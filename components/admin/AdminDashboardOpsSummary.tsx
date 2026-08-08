import { formatPrice } from "@/features/catalog/format-price";
import type { AdminDashboardKpis } from "@/features/admin/dashboard/types";

type OpsTile = {
  label: string;
  value: string;
};

/**
 * Faixa superior do Painel — KPIs ops brand-first (Slice P / VERDICT).
 */
export function AdminDashboardOpsSummary({
  kpis,
}: {
  kpis: AdminDashboardKpis;
}) {
  const tiles: OpsTile[] = [
    {
      label: "Vendas hoje",
      value: formatPrice(kpis.salesTodayAmount),
    },
    {
      label: "Pedidos pagos",
      value: String(kpis.ordersPaid),
    },
    {
      label: "Holds ativos",
      value: String(kpis.activeHolds),
    },
    {
      label: "Sacolinha",
      value: String(kpis.ordersNaSacolinha),
    },
  ];

  return (
    <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {tiles.map((tile) => (
        <li
          key={tile.label}
          className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm"
        >
          <p className="text-xs font-medium text-[var(--brand-green)]">
            {tile.label}
          </p>
          <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums text-foreground">
            {tile.value}
          </p>
        </li>
      ))}
    </ul>
  );
}
