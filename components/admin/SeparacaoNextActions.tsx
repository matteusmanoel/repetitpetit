"use client";

import { MessageCircle, Store, Truck } from "lucide-react";
import { useTransition } from "react";
import { brandToast } from "@/lib/brand-toast";

import { useFulfillmentQueue } from "@/components/admin/FulfillmentQueueProvider";
import {
  confirmOrderAction,
  markNaSacolinhaAction,
  markReadyForPickupAction,
  markShippedAction,
} from "@/features/admin/fulfillment/actions";
import type { FulfillmentTransitionResult } from "@/features/admin/fulfillment/apply-transition";
import { isUrgentDeliveryFulfillment } from "@/features/admin/fulfillment/queue-logic";
import { orderAllPacked } from "@/features/admin/fulfillment/separacao-logic";
import type { FulfillmentQueueOrder } from "@/features/admin/fulfillment/types";
import type { OrderStatus } from "@/features/orders/types";
import { publicEnv } from "@/lib/env/public";
import { getWhatsAppUrl } from "@/lib/whatsapp";

type NextActionKind = "motoboy" | "envio" | "retirada" | "whatsapp";

function openWhatsApp(phoneDigits: string | null | undefined, message: string) {
  if (!phoneDigits) {
    brandToast.error("Telefone não disponível.");
    return;
  }
  window.open(
    getWhatsAppUrl(phoneDigits, message),
    "_blank",
    "noopener,noreferrer",
  );
}

function handleTransitionResult(
  result: FulfillmentTransitionResult,
  successMessage: string,
  applyLocalTransition: (
    orderId: string,
    status: OrderStatus,
    extras?: { trackingCode?: string | null },
  ) => void,
  extras?: { trackingCode?: string | null },
): boolean {
  if (!result.ok) {
    brandToast.error(result.error);
    return false;
  }
  if (result.outcome === "idempotent") {
    brandToast.message("Status já atualizado.");
  } else {
    brandToast.success(successMessage);
  }
  applyLocalTransition(result.orderId, result.status, extras);
  return true;
}

/**
 * Próxima ação pós-checklist (VERDICT / D121).
 * Desktop: toolbar; mobile: ícones no card. Não aparece sem checklist completo.
 */
export function SeparacaoNextActions({
  order,
  layout,
}: {
  order: FulfillmentQueueOrder;
  layout: "toolbar" | "icons";
}) {
  const { applyLocalTransition } = useFulfillmentQueue();
  const [isPending, startTransition] = useTransition();

  if (!orderAllPacked(order)) return null;

  const urgent = isUrgentDeliveryFulfillment(order.fulfillmentType);
  const customerName = order.customerName ?? "cliente";
  const isPickupLike =
    order.fulfillmentType === "pickup" ||
    order.fulfillmentType === "store_counter";

  const run = (kind: NextActionKind) => {
    switch (kind) {
      case "motoboy": {
        const storePhone = publicEnv.NEXT_PUBLIC_STORE_WHATSAPP;
        if (!storePhone) {
          brandToast.message(
            "Configure NEXT_PUBLIC_STORE_WHATSAPP para avisar o motoboy.",
          );
          return;
        }
        openWhatsApp(
          storePhone,
          `Entrega urgente — pedido ${order.publicCode} · ${customerName}. Combinar motoboy.`,
        );
        break;
      }
      case "whatsapp": {
        openWhatsApp(
          order.customerPhone,
          `Oi ${customerName}! Seu pedido ${order.publicCode} já está separado.`,
        );
        break;
      }
      case "retirada": {
        startTransition(async () => {
          if (order.status === "paid") {
            const confirmed = await confirmOrderAction(order.id);
            if (!confirmed.ok) {
              brandToast.error(confirmed.error);
              return;
            }
            applyLocalTransition(confirmed.orderId, confirmed.status);
          }
          const result = await markNaSacolinhaAction(order.id);
          handleTransitionResult(
            result,
            "Pedido na sacolinha — pronto para retirada.",
            applyLocalTransition,
          );
        });
        break;
      }
      case "envio": {
        startTransition(async () => {
          if (order.status === "paid") {
            const confirmed = await confirmOrderAction(order.id);
            if (!confirmed.ok) {
              brandToast.error(confirmed.error);
              return;
            }
            applyLocalTransition(confirmed.orderId, confirmed.status);
          }

          if (order.fulfillmentType === "delivery") {
            const result = await markReadyForPickupAction(order.id);
            handleTransitionResult(
              result,
              "Pedido pronto para entrega.",
              applyLocalTransition,
            );
            return;
          }

          const tracking = window.prompt(
            "Código de rastreio (Correios):",
            order.trackingCode ?? "",
          );
          if (tracking === null) return;
          const code = tracking.trim();
          if (!code) {
            brandToast.error("Informe o código de rastreio.");
            return;
          }
          const result = await markShippedAction(order.id, code);
          handleTransitionResult(
            result,
            "Pedido marcado como enviado.",
            applyLocalTransition,
            { trackingCode: code },
          );
        });
        break;
      }
    }
  };

  if (layout === "icons") {
    const iconBtn =
      "flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl shadow-sm disabled:opacity-50";
    return (
      <div
        className="absolute right-2 top-2 z-10 flex flex-col gap-1.5 lg:hidden"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        {urgent ? (
          <button
            type="button"
            title="WhatsApp motoboy"
            aria-label="WhatsApp motoboy"
            disabled={isPending}
            className={`${iconBtn} bg-[var(--brand-pink)] text-white`}
            onClick={() => run("motoboy")}
          >
            <MessageCircle className="size-4" />
          </button>
        ) : (
          <>
            {isPickupLike ? (
              <button
                type="button"
                title="Retirada"
                aria-label="Retirada"
                disabled={isPending}
                className={`${iconBtn} bg-[var(--brand-green)] text-white`}
                onClick={() => run("retirada")}
              >
                <Store className="size-4" />
              </button>
            ) : (
              <button
                type="button"
                title="Envio"
                aria-label="Envio"
                disabled={isPending}
                className={`${iconBtn} bg-[var(--brand-blue)] text-white`}
                onClick={() => run("envio")}
              >
                <Truck className="size-4" />
              </button>
            )}
            <button
              type="button"
              title="WhatsApp cliente"
              aria-label="WhatsApp cliente"
              disabled={isPending}
              className={`${iconBtn} border border-[#25D366]/40 bg-[#25D366]/15 text-[#128C7E]`}
              onClick={() => run("whatsapp")}
            >
              <MessageCircle className="size-4" />
            </button>
          </>
        )}
      </div>
    );
  }

  const barBtn =
    "inline-flex h-12 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl px-4 text-base font-semibold disabled:opacity-50";

  return (
    <div className="hidden shrink-0 items-center gap-2 lg:flex">
      {urgent ? (
        <button
          type="button"
          disabled={isPending}
          className={`${barBtn} bg-[var(--brand-pink)] text-white`}
          onClick={() => run("motoboy")}
        >
          <MessageCircle className="size-4" />
          WhatsApp motoboy
        </button>
      ) : (
        <>
          {isPickupLike ? (
            <button
              type="button"
              disabled={isPending}
              className={`${barBtn} bg-[var(--brand-green)] text-white`}
              onClick={() => run("retirada")}
            >
              <Store className="size-4" />
              Retirada
            </button>
          ) : (
            <button
              type="button"
              disabled={isPending}
              className={`${barBtn} bg-[var(--brand-blue)] text-white`}
              onClick={() => run("envio")}
            >
              <Truck className="size-4" />
              Envio
            </button>
          )}
          <button
            type="button"
            disabled={isPending}
            className={`${barBtn} border border-[#25D366]/40 bg-[#25D366]/10 text-[#128C7E]`}
            onClick={() => run("whatsapp")}
          >
            <MessageCircle className="size-4" />
            WhatsApp
          </button>
        </>
      )}
    </div>
  );
}
