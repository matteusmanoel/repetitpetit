"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { useFulfillmentQueue } from "@/components/admin/FulfillmentQueueProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  cancelOrderAction,
  completeOrderAction,
  confirmOrderAction,
  markNaSacolinhaAction,
  markReadyForPickupAction,
  markShippedAction,
} from "@/features/admin/fulfillment/actions";
import type { FulfillmentTransitionResult } from "@/features/admin/fulfillment/apply-transition";
import { isUrgentDeliveryFulfillment } from "@/features/admin/fulfillment/queue-logic";
import type { FulfillmentQueueOrder } from "@/features/admin/fulfillment/types";
import { formatPrice } from "@/features/catalog/format-price";
import {
  getFulfillmentLabel,
  getOrderStatusLabel,
} from "@/features/orders/status";
import { cn } from "@/lib/utils";

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
 * Card da fila — ações de transição T20 / #125 conforme status atual.
 */
export function FulfillmentOrderCard({
  order,
}: {
  order: FulfillmentQueueOrder;
}) {
  const { applyLocalTransition } = useFulfillmentQueue();
  const [isPending, startTransition] = useTransition();
  const [trackingCode, setTrackingCode] = useState(order.trackingCode ?? "");
  const [showShipForm, setShowShipForm] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const itemSummary =
    order.itemCount === 1 ? "1 peça" : `${order.itemCount} peças`;

  const isUrgentDelivery = isUrgentDeliveryFulfillment(order.fulfillmentType);
  const canCancel = order.status === "paid" || order.status === "confirmed";
  const showNaSacolinha =
    order.status === "confirmed" && order.fulfillmentType === "pickup";
  const showReadyForPickup =
    order.status === "confirmed" && order.fulfillmentType === "delivery";
  const canComplete =
    order.status === "ready_for_pickup" ||
    order.status === "na_sacolinha" ||
    order.status === "shipped";

  const run = (
    action: () => Promise<FulfillmentTransitionResult>,
    successMessage: string,
    extras?: { trackingCode?: string | null },
  ) => {
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      if (result.outcome === "idempotent") {
        toast.message("Status já atualizado.");
      } else {
        toast.success(successMessage);
      }
      applyLocalTransition(order.id, result.status, extras);
      setConfirmCancel(false);
      setShowShipForm(false);
    });
  };

  return (
    <article
      className={cn(
        "flex flex-col gap-3 rounded-lg border bg-card px-4 py-4",
        isUrgentDelivery
          ? "border-destructive ring-1 ring-destructive/40"
          : "border-border",
      )}
      aria-label={
        isUrgentDelivery
          ? `Pedido ${order.publicCode}, entrega urgente`
          : `Pedido ${order.publicCode}`
      }
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-heading text-lg font-extrabold text-foreground">
              {order.publicCode}
            </h2>
            {isUrgentDelivery ? (
              <span className="shrink-0 rounded bg-destructive px-2 py-0.5 text-[10px] font-bold tracking-wide text-destructive-foreground">
                ENTREGA URGENTE
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {formatPaidAt(order.paidAt)} ·{" "}
            {getFulfillmentLabel(order.fulfillmentType)}
          </p>
          {order.status !== "paid" ? (
            <p className="mt-1 text-xs font-medium text-foreground">
              {getOrderStatusLabel(order.status)}
            </p>
          ) : null}
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
        {order.trackingCode ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Rastreio:{" "}
            <span className="font-medium text-foreground">
              {order.trackingCode}
            </span>
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        {order.status === "paid" ? (
          <Button
            type="button"
            size="lg"
            className="min-h-11 w-full"
            disabled={isPending}
            onClick={() =>
              run(() => confirmOrderAction(order.id), "Pedido em separação.")
            }
          >
            Conferir e separar
          </Button>
        ) : null}

        {showNaSacolinha ? (
          <Button
            type="button"
            size="lg"
            className="min-h-11 w-full"
            disabled={isPending}
            onClick={() =>
              run(
                () => markNaSacolinhaAction(order.id),
                "Pedido na sacolinha.",
              )
            }
          >
            Marcar na sacolinha
          </Button>
        ) : null}

        {showReadyForPickup ? (
          <Button
            type="button"
            size="lg"
            className="min-h-11 w-full"
            disabled={isPending}
            onClick={() =>
              run(
                () => markReadyForPickupAction(order.id),
                "Pedido pronto para retirada.",
              )
            }
          >
            Pronto para retirada
          </Button>
        ) : null}

        {order.status === "confirmed" && !showShipForm ? (
          <Button
            type="button"
            size="lg"
            variant={
              order.fulfillmentType === "correios" ? "default" : "outline"
            }
            className="min-h-11 w-full"
            disabled={isPending}
            onClick={() => setShowShipForm(true)}
          >
            Marcar como enviado
          </Button>
        ) : null}

        {order.status === "confirmed" && showShipForm ? (
          <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
            <Label htmlFor={`tracking-${order.id}`}>Código de rastreio</Label>
            <Input
              id={`tracking-${order.id}`}
              value={trackingCode}
              onChange={(e) => setTrackingCode(e.target.value)}
              placeholder="Ex.: AA123456789BR"
              disabled={isPending}
              className="min-h-11"
              autoComplete="off"
            />
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                size="lg"
                className="min-h-11 w-full"
                disabled={isPending || !trackingCode.trim()}
                onClick={() =>
                  run(
                    () => markShippedAction(order.id, trackingCode.trim()),
                    "Pedido marcado como enviado.",
                    { trackingCode: trackingCode.trim() },
                  )
                }
              >
                Confirmar envio
              </Button>
              <Button
                type="button"
                size="lg"
                variant="outline"
                className="min-h-11 w-full"
                disabled={isPending}
                onClick={() => setShowShipForm(false)}
              >
                Voltar
              </Button>
            </div>
          </div>
        ) : null}

        {canComplete ? (
          <Button
            type="button"
            size="lg"
            className="min-h-11 w-full"
            disabled={isPending}
            onClick={() =>
              run(() => completeOrderAction(order.id), "Pedido concluído.")
            }
          >
            Marcar como concluído
          </Button>
        ) : null}

        {canCancel && !confirmCancel ? (
          <Button
            type="button"
            size="lg"
            variant="ghost"
            className="min-h-11 w-full text-destructive hover:text-destructive"
            disabled={isPending}
            onClick={() => setConfirmCancel(true)}
          >
            Cancelar pedido
          </Button>
        ) : null}

        {confirmCancel ? (
          <div className="flex flex-col gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
            <p className="text-sm text-foreground">
              Cancelar o pedido {order.publicCode}?
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                size="lg"
                variant="destructive"
                className="min-h-11 w-full"
                disabled={isPending}
                onClick={() =>
                  run(() => cancelOrderAction(order.id), "Pedido cancelado.")
                }
              >
                Confirmar cancelamento
              </Button>
              <Button
                type="button"
                size="lg"
                variant="outline"
                className="min-h-11 w-full"
                disabled={isPending}
                onClick={() => setConfirmCancel(false)}
              >
                Manter pedido
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </article>
  );
}
