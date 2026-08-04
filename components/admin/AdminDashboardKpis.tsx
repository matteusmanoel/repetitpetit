import Link from "next/link";

import type { AdminDashboardKpis } from "@/features/admin/dashboard/types";
import { cn } from "@/lib/utils";

type KpiItem = {
  label: string;
  hint: string;
  value: number;
  href?: string;
  /** Destaque âmbar quando value > 0 (ex.: holds expirando). */
  warnWhenPositive?: boolean;
};

function KpiTile({ label, hint, value, href, warnWhenPositive }: KpiItem) {
  const warn = Boolean(warnWhenPositive && value > 0);
  const className = cn(
    "block rounded-lg border px-4 py-4 transition-colors",
    warn
      ? "border-amber-400 bg-amber-50 text-amber-950"
      : "border-border bg-card",
    href && !warn && "hover:border-primary/40 hover:bg-muted/40",
    href && warn && "hover:border-amber-500 hover:bg-amber-100/80",
  );

  const body = (
    <>
      <p
        className={cn(
          "text-xs font-medium uppercase tracking-wide",
          warn ? "text-amber-800" : "text-muted-foreground",
        )}
      >
        {label}
      </p>
      <p
        className={cn(
          "mt-2 font-heading text-3xl font-extrabold tabular-nums",
          warn ? "text-amber-950" : "text-foreground",
        )}
      >
        {value}
      </p>
      <p
        className={cn(
          "mt-1 text-sm",
          warn ? "text-amber-900/80" : "text-muted-foreground",
        )}
      >
        {hint}
      </p>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={className}>
        {body}
      </Link>
    );
  }

  return <div className={className}>{body}</div>;
}

function KpiSection({
  id,
  title,
  items,
}: {
  id: string;
  title: string;
  items: readonly KpiItem[];
}) {
  return (
    <section className="flex flex-col gap-3" aria-labelledby={id}>
      <h2
        id={id}
        className="font-heading text-base font-extrabold text-foreground"
      >
        {title}
      </h2>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <li key={item.label}>
            <KpiTile {...item} />
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * Grades de KPI do painel — peças, Hold Sessions (D66) e pedidos.
 */
export function AdminDashboardKpis({ kpis }: { kpis: AdminDashboardKpis }) {
  const productItems: KpiItem[] = [
    {
      label: "Disponíveis",
      hint: "À venda no catálogo",
      value: kpis.productsAvailable,
      href: "/admin/produtos?status=available",
    },
    {
      label: "Holds ativos",
      hint: "Sessões de hold ainda válidas",
      value: kpis.activeHolds,
      href: "/admin/produtos?status=hold",
    },
    {
      label: "Vendidas",
      hint: "Já saíram do catálogo",
      value: kpis.productsSold,
      href: "/admin/produtos?status=sold",
    },
  ];

  const holdOpsItems: KpiItem[] = [
    {
      label: "Expirando em breve",
      hint: "Holds ativos com menos de 5 min",
      value: kpis.holdsExpiringSoon,
      warnWhenPositive: true,
      href: "/admin/produtos?status=hold",
    },
    {
      label: "Vendas loja hoje",
      hint: "Pedidos canal loja (hoje)",
      value: kpis.storeOrdersToday,
      href: "/admin/pos",
    },
    {
      label: "Overrides hoje",
      hint: "Cancelamentos de hold no balcão",
      value: kpis.overridesToday,
      href: "/admin/override",
    },
  ];

  const orderItems: KpiItem[] = [
    {
      label: "Pagos",
      hint: "Aguardando confirmação",
      value: kpis.ordersPaid,
      href: "/admin/pedidos",
    },
    {
      label: "Em separação",
      hint: "Confirmados pelo lojista",
      value: kpis.ordersConfirmed,
    },
    {
      label: "Enviados",
      hint: "Despachados pelos Correios",
      value: kpis.ordersShipped,
    },
  ];

  return (
    <div className="flex flex-col gap-8">
      <KpiSection id="kpi-pecas" title="Peças" items={productItems} />
      <KpiSection
        id="kpi-hold-loja"
        title="Hold e loja"
        items={holdOpsItems}
      />
      <KpiSection id="kpi-pedidos" title="Pedidos" items={orderItems} />
    </div>
  );
}
