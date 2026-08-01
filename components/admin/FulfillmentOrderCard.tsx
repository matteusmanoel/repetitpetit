import { formatPrice } from "@/features/catalog/format-price";
import { getFulfillmentLabel } from "@/features/orders/status";
import type { FulfillmentQueueOrder } from "@/features/admin/fulfillment/types";
import { Button } from "@/components/ui/button";

function formatPaidAt(iso: string | null): string {
  if (!iso) return "Pago agora";
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
      timeZone: "America/Sao_Paulo",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

/**
 * Card da fila — resumo do pedido pago.
 * CTA "Conferir e separar" fica desabilitado até T20/#21 (transições).
 */
export function FulfillmentOrderCard({
  order,
}: {
  order: FulfillmentQueueOrder;
}) {
  const itemSummary =
    order.itemCount === 1
      ? "1 peça"
      : `${order.itemCount} peças`;

  return (
    <article
      className="flex flex-col gap-3 rounded-lg border border-border bg-card px-4 py-4"
      aria-label={`Pedido ${order.publicCode}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-heading text-lg font-extrabold text-foreground">
            {order.publicCode}
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {formatPaidAt(order.paidAt)} · {getFulfillmentLabel(order.fulfillmentType)}
          </p>
        </div>
        <p className="shrink-0 font-heading text-base font-extrabold tabular-nums text-primary">
          {formatPrice(order.totalAmount)}
        </p>
      </div>

      <div className="text-sm text-foreground">
        <p className="font-medium">
          {order.customerName ?? "Cliente"}
          {order.customerPhone ? (
            <span className="font-normal text-muted-foreground">
              {" "}
              · {order.customerPhone}
            </span>
          ) : null}
        </p>
        <p className="mt-1 text-muted-foreground">{itemSummary}</p>
        {order.items.length > 0 ? (
          <ul className="mt-2 flex flex-col gap-1">
            {order.items.map((item) => (
              <li key={item.id} className="truncate text-muted-foreground">
                {item.productName}
                {item.quantity > 1 ? ` × ${item.quantity}` : ""}
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {/* T20/#21: ligar transição paid → confirmed */}
      <Button type="button" className="w-full sm:w-auto" disabled>
        Conferir e separar
      </Button>
    </article>
  );
}
