import Link from "next/link";

import type { AdminDashboardKpis } from "@/features/admin/dashboard/types";

type KpiItem = {
  label: string;
  hint: string;
  value: number;
  href?: string;
};

function KpiTile({ label, hint, value, href }: KpiItem) {
  const body = (
    <>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 font-heading text-3xl font-extrabold tabular-nums text-foreground">
        {value}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">{hint}</p>
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="block rounded-lg border border-border bg-card px-4 py-4 transition-colors hover:border-primary/40 hover:bg-muted/40"
      >
        {body}
      </Link>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card px-4 py-4">
      {body}
    </div>
  );
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
      <ul className="grid gap-3 sm:grid-cols-3">
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
 * Grades de KPI do painel — peças (acervo/reservas) e pedidos (fulfillment).
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
      label: "Reservadas",
      hint: "Com reserva ativa no carrinho",
      value: kpis.productsReserved,
    },
    {
      label: "Vendidas",
      hint: "Já saíram do catálogo",
      value: kpis.productsSold,
      href: "/admin/produtos?status=sold",
    },
  ];

  const orderItems: KpiItem[] = [
    {
      label: "Pagos",
      hint: "Aguardando confirmação",
      value: kpis.ordersPaid,
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
      <KpiSection id="kpi-pedidos" title="Pedidos" items={orderItems} />
    </div>
  );
}
