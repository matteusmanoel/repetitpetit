import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { formatPrice } from "@/features/catalog/format-price";
import { signOutBuyerToEntrarAction } from "@/features/buyer/actions";
import {
  listBuyerOrderSummaries,
  listSacolinhaPanelItems,
} from "@/features/buyer/sacolinha";
import { requireBuyerSession } from "@/features/buyer/session";

export const metadata: Metadata = {
  title: "Minha Sacolinha",
  description: "Pedidos e peças da Repeti Petit.",
};

/**
 * Painel do comprador (SO-03 / SS-6): peças ativas + histórico de pedidos.
 */
export default async function SacolinhaPanelPage() {
  const session = await requireBuyerSession("/sacolinha");
  const [items, orders] = await Promise.all([
    listSacolinhaPanelItems(session.customer.id),
    listBuyerOrderSummaries(session.customer.id),
  ]);

  const activeOrders = orders.filter((o) => o.section === "active");
  const historyOrders = orders.filter((o) => o.section === "history");

  return (
    <div className="mx-auto w-full max-w-lg flex-1 px-4 py-10 sm:px-8 sm:py-12">
      <p className="text-sm font-medium text-primary">Repeti Petit</p>
      <h1 className="font-display mt-2 text-3xl text-foreground">
        Minha Sacolinha
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Olá, {session.customer.full_name.split(" ")[0]} — acompanhe peças e
        pedidos.
      </p>

      <section className="mt-8">
        <h2 className="text-base font-bold text-foreground">
          Peças em andamento
        </h2>
        {items.length === 0 ? (
          <div className="mt-3 rounded-3xl border border-border px-5 py-8 text-center">
            <p className="text-sm font-medium text-foreground">
              Nenhuma peça aguardando retirada
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Quando um pedido for pago, as peças aparecem aqui.
            </p>
            <Link
              href="/catalogo"
              className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground"
            >
              Ver catálogo
            </Link>
          </div>
        ) : (
          <ul className="mt-3 flex flex-col gap-3">
            {items.map((item) => (
              <li
                key={item.orderItemId}
                className="flex gap-3 rounded-3xl border border-border p-3 text-left"
              >
                <div className="relative size-20 shrink-0 overflow-hidden rounded-2xl bg-muted">
                  {item.coverImageUrl ? (
                    <Image
                      src={item.coverImageUrl}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="80px"
                    />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-foreground">
                    {item.productName}
                  </p>
                  <p className="mt-0.5 text-sm font-medium text-primary">
                    {formatPrice(item.unitPrice)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {item.orderStatusLabel} · {item.fulfillmentLabel}
                  </p>
                  <Link
                    href={`/pedido/${item.publicCode}`}
                    className="mt-1 inline-block text-xs font-medium text-primary underline-offset-4 hover:underline"
                  >
                    Pedido {item.publicCode}
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-base font-bold text-foreground">Meus pedidos</h2>
        {activeOrders.length === 0 && historyOrders.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Você ainda não tem pedidos nesta conta.
          </p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {[...activeOrders, ...historyOrders].map((order) => (
              <li key={order.publicCode}>
                <Link
                  href={`/pedido/${order.publicCode}`}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-border px-4 py-3 transition hover:bg-muted/50"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-foreground">
                      {order.publicCode}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {order.statusLabel} · {order.itemCount}{" "}
                      {order.itemCount === 1 ? "peça" : "peças"} ·{" "}
                      {order.fulfillmentLabel}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-primary">
                    {formatPrice(order.totalAmount)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <form action={signOutBuyerToEntrarAction} className="mt-10">
        <button
          type="submit"
          className="inline-flex h-11 w-full items-center justify-center rounded-full px-6 text-sm font-medium text-foreground hover:bg-muted"
        >
          Sair
        </button>
      </form>
    </div>
  );
}
