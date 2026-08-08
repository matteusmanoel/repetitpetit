"use client";

import { CheckIcon, ShoppingBag } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { useCartStore } from "@/features/cart/store";
import { cn } from "@/lib/utils";

type ProductCardQuickAddProps = {
  productId: string;
  name: string;
  slug: string;
  price: number;
  coverImageUrl: string | null;
  disabled?: boolean;
};

/**
 * CTA hover no card do catálogo (SS-3) — reserva via Hold Session.
 * Desktop only (parent hides on touch / small screens).
 */
export function ProductCardQuickAdd({
  productId,
  name,
  slug,
  price,
  coverImageUrl,
  disabled,
}: ProductCardQuickAddProps) {
  const router = useRouter();
  const addItem = useCartStore((s) => s.addItem);
  const hasProduct = useCartStore((s) => s.hasProduct(productId));
  const openCart = useCartStore((s) => s.openCart);
  const [isPending, startTransition] = useTransition();
  const [justAdded, setJustAdded] = useState(false);

  async function handleClick(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();

    if (disabled) return;

    if (hasProduct) {
      openCart();
      return;
    }

    try {
      const response = await fetch("/api/hold/reserve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });

      const payload = (await response.json().catch(() => null)) as {
        holdSessionId?: string;
        expiresAt?: string;
        message?: string;
        error?: string;
      } | null;

      if (response.status === 409 && payload?.error === "limit_reached") {
        toast.message("Você já tem 5 peças reservadas");
        return;
      }

      if (response.status === 409) {
        toast.message(payload?.message ?? "Esta peça não está mais disponível.");
        startTransition(() => router.refresh());
        return;
      }

      if (!response.ok || !payload?.holdSessionId || !payload.expiresAt) {
        toast.message(
          payload?.message ?? "Não foi possível reservar. Tente de novo.",
        );
        return;
      }

      addItem(
        {
          productId,
          name,
          slug,
          price,
          coverImageUrl,
          quantity: 1,
          reservationId: payload.holdSessionId,
          expiresAt: payload.expiresAt,
        },
        {
          holdSessionId: payload.holdSessionId,
          expiresAt: payload.expiresAt,
        },
      );

      setJustAdded(true);
      window.setTimeout(() => setJustAdded(false), 1200);
      startTransition(() => router.refresh());
    } catch {
      toast.message("Falha de rede ao reservar.");
    }
  }

  return (
    <button
      type="button"
      disabled={disabled || isPending}
      onClick={handleClick}
      className={cn(
        "absolute inset-x-0 bottom-0 z-10 flex h-10 translate-y-1 items-center justify-center gap-1.5 rounded-full bg-primary px-3 text-sm font-semibold text-primary-foreground opacity-0 shadow-md transition",
        "pointer-events-none group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100",
        "focus-visible:pointer-events-auto focus-visible:translate-y-0 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring",
        (disabled || isPending) && "cursor-not-allowed opacity-60",
      )}
    >
      {justAdded ? (
        <>
          <CheckIcon className="size-4" aria-hidden />
          Reservada
        </>
      ) : isPending ? (
        "Reservando…"
      ) : hasProduct ? (
        "Ver sacolinha"
      ) : (
        <>
          <ShoppingBag className="size-4" aria-hidden />
          Adicionar ao Carrinho
        </>
      )}
    </button>
  );
}
