"use client";

import { Check } from "lucide-react";
import { useTransition } from "react";

import { useFulfillmentQueue } from "@/components/admin/FulfillmentQueueProvider";
import { toggleOrderItemPackedAction } from "@/features/admin/fulfillment/actions";
import type { FulfillmentQueueItem } from "@/features/admin/fulfillment/types";
import { formatPrice } from "@/features/catalog/format-price";
import { brandToast } from "@/lib/brand-toast";
import { cn } from "@/lib/utils";

/**
 * Card de peça na grade de Separação — check persiste `packed_at` (ADR 0002).
 */
export function SeparacaoPieceCard({
  item,
  badge,
  urgent,
}: {
  item: FulfillmentQueueItem;
  badge: "a_separar" | "em_separacao";
  urgent?: boolean;
}) {
  const { applyLocalPackedAtChange } = useFulfillmentQueue();
  const [isPending, startTransition] = useTransition();
  const checked = Boolean(item.packedAt);

  const badgeClass =
    badge === "a_separar"
      ? "bg-[var(--brand-pink)]/15 text-[var(--brand-pink)]"
      : "bg-[var(--brand-blue)]/15 text-[var(--brand-blue)]";

  const onCheck = () => {
    startTransition(async () => {
      const result = await toggleOrderItemPackedAction(item.id);
      if (!result.ok) {
        brandToast.error(result.error);
        return;
      }
      applyLocalPackedAtChange(
        result.orderId,
        result.orderItemId,
        result.packedAt,
      );
      brandToast.message("Check de separação atualizado");
    });
  };

  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="relative aspect-[3/4] bg-zinc-100">
        {item.coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- snapshot URL may be external storage
          <img
            src={item.coverImageUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
            Sem foto
          </div>
        )}
        <span
          className={cn(
            "absolute left-2 top-2 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase",
            badgeClass,
          )}
        >
          {badge === "a_separar" ? "a separar" : "em separação"}
        </span>
        {urgent ? (
          <span className="absolute right-2 top-2 rounded-full bg-[var(--brand-pink)] px-2.5 py-1 text-[11px] font-bold text-white">
            URGENTE
          </span>
        ) : null}
      </div>
      <div className="space-y-1 p-3">
        <p className="line-clamp-2 text-sm font-semibold leading-snug">
          {item.productName}
          {item.quantity > 1 ? ` × ${item.quantity}` : ""}
        </p>
        <p className="text-lg font-bold text-[var(--brand-green)]">
          {formatPrice(item.unitPrice)}
        </p>
      </div>
      <div className="mt-auto border-t border-border bg-card p-2">
        <button
          type="button"
          onClick={onCheck}
          disabled={isPending}
          className={cn(
            "flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl text-sm font-bold shadow-sm transition disabled:opacity-60",
            checked
              ? "bg-[var(--brand-green)] text-white"
              : "border border-border bg-white text-foreground hover:bg-muted/60",
          )}
          aria-label={checked ? "Desmarcar separado" : "Marcar separado"}
          aria-pressed={checked}
        >
          <Check className="size-5" />
          {checked ? "Separado" : "Marcar"}
        </button>
      </div>
    </article>
  );
}
