"use client";

import { AnimatePresence, motion } from "motion/react";
import { XIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Dialog as SheetPrimitive } from "radix-ui";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { formatCountdown, isReservationExpired } from "@/features/cart/countdown";
import {
  releaseHoldItemClient,
  releaseHoldSessionClient,
} from "@/features/cart/release-hold-client";
import { useCartStore, type CartItem } from "@/features/cart/store";
import { formatPrice } from "@/features/catalog/format-price";
import { cn } from "@/lib/utils";

/** Abaixo desse limite o countdown vira coral (T7). */
const URGENT_THRESHOLD_MS = 5 * 60 * 1000;

function remainingMs(expiresAt: string, nowMs: number): number {
  const expiresMs = new Date(expiresAt).getTime();
  return Number.isNaN(expiresMs) ? 0 : expiresMs - nowMs;
}

type HoldSessionApiResponse = {
  session: {
    holdSessionId: string;
    expiresAt: string;
    items: Array<{
      productId: string;
      holdItemId: string;
      name: string;
      slug: string;
      price: number;
      coverImageUrl: string | null;
    }>;
  } | null;
};

/**
 * Hold Sheet: espelho da Hold Session com countdown da sessão (SN-04 / D61).
 */
export function CartSheet() {
  const items = useCartStore((s) => s.items);
  const holdSessionId = useCartStore((s) => s.holdSessionId);
  const sessionExpiresAt = useCartStore((s) => s.expiresAt);
  const isOpen = useCartStore((s) => s.isOpen);
  const setOpen = useCartStore((s) => s.setOpen);
  const closeCart = useCartStore((s) => s.closeCart);
  const removeItem = useCartStore((s) => s.removeItem);
  const clearHold = useCartStore((s) => s.clearHold);
  const hydrateFromServer = useCartStore((s) => s.hydrateFromServer);
  const hasHydrated = useCartStore((s) => s.hasHydrated);
  const subtotal = useCartStore((s) => s.getSubtotal());

  const sessionExpiringRef = useRef(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const expiresAt =
    sessionExpiresAt ?? items[0]?.expiresAt ?? null;

  useEffect(() => {
    if (!hasHydrated) return;

    let cancelled = false;

    void (async () => {
      try {
        const response = await fetch("/api/hold/session", { method: "GET" });
        if (!response.ok || cancelled) return;
        const payload = (await response.json()) as HoldSessionApiResponse;
        if (cancelled) return;
        if (!payload.session) {
          if (useCartStore.getState().items.length > 0) {
            // Server has no active hold — clear stale mirror.
            clearHold();
          }
          return;
        }
        hydrateFromServer({
          holdSessionId: payload.session.holdSessionId,
          expiresAt: payload.session.expiresAt,
          items: payload.session.items.map((item) => ({
            productId: item.productId,
            name: item.name,
            slug: item.slug,
            price: item.price,
            coverImageUrl: item.coverImageUrl,
            quantity: 1 as const,
            reservationId: item.holdItemId,
            expiresAt: payload.session!.expiresAt,
          })),
        });
      } catch (error) {
        console.error("Falha ao hidratar Hold Session:", error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [hasHydrated, hydrateFromServer, clearHold]);

  useEffect(() => {
    const id = window.setInterval(() => {
      setNowMs(Date.now());

      const state = useCartStore.getState();
      const sessionExpiry = state.expiresAt ?? state.items[0]?.expiresAt;
      if (!sessionExpiry || state.items.length === 0) {
        sessionExpiringRef.current = false;
        return;
      }

      if (!isReservationExpired(sessionExpiry)) {
        sessionExpiringRef.current = false;
        return;
      }

      if (sessionExpiringRef.current) return;
      sessionExpiringRef.current = true;

      clearHold();
      toast.message("O tempo da sua reserva acabou");
      void releaseHoldSessionClient("expired").finally(() => {
        sessionExpiringRef.current = false;
      });
    }, 1000);

    return () => window.clearInterval(id);
  }, [clearHold]);

  async function handleRemove(item: CartItem) {
    removeItem(item.productId);
    await releaseHoldItemClient(item.productId);
  }

  const checkoutHref = holdSessionId
    ? `/checkout?holdSessionId=${encodeURIComponent(holdSessionId)}`
    : "/checkout";

  const urgent =
    expiresAt != null && remainingMs(expiresAt, nowMs) <= URGENT_THRESHOLD_MS;

  return (
    <SheetPrimitive.Root open={isOpen} onOpenChange={setOpen}>
      <AnimatePresence>
        {isOpen ? (
          <SheetPrimitive.Portal forceMount>
            <SheetPrimitive.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              />
            </SheetPrimitive.Overlay>

            <SheetPrimitive.Content asChild forceMount>
              <motion.div
                className="fixed inset-0 z-50 flex w-full flex-col gap-0 bg-popover text-sm text-popover-foreground shadow-lg md:inset-y-0 md:right-0 md:left-auto md:max-w-md"
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", stiffness: 340, damping: 34 }}
              >
                <div className="flex flex-col gap-0.5 border-b border-border p-4 md:p-5">
                  <SheetPrimitive.Title className="text-xl font-bold text-primary md:text-2xl">
                    Minha sacola
                  </SheetPrimitive.Title>
                  <SheetPrimitive.Description className="text-sm text-muted-foreground">
                    {items.length === 0
                      ? "Nenhuma peça reservada ainda."
                      : `${items.length} ${items.length === 1 ? "peça reservada" : "peças reservadas"} — finalize antes do tempo acabar.`}
                  </SheetPrimitive.Description>
                  {items.length > 0 && expiresAt ? (
                    <p
                      className={cn(
                        "mt-1 font-mono text-base tabular-nums",
                        urgent
                          ? "font-semibold text-destructive"
                          : "font-medium text-foreground",
                      )}
                      aria-label={`Tempo restante da reserva: ${formatCountdown(expiresAt, nowMs)}`}
                    >
                      {formatCountdown(expiresAt, nowMs)}
                    </p>
                  ) : null}
                  <SheetPrimitive.Close asChild>
                    <Button
                      variant="ghost"
                      className="absolute top-3 right-3"
                      size="icon-sm"
                    >
                      <XIcon />
                      <span className="sr-only">Fechar</span>
                    </Button>
                  </SheetPrimitive.Close>
                </div>

                <div className="flex-1 overflow-y-auto px-4 py-3">
                  {items.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">
                      Explore o catálogo e reserve uma peça única.
                    </p>
                  ) : (
                    <ul className="flex flex-col gap-4">
                      <AnimatePresence initial={false}>
                        {items.map((item) => (
                          <motion.li
                            key={item.productId}
                            layout
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.2 }}
                            className="flex gap-3 border-b border-border pb-4 last:border-b-0"
                          >
                            <Link
                              href={`/produto/${item.slug}`}
                              onClick={closeCart}
                              className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-muted"
                            >
                              {item.coverImageUrl ? (
                                <Image
                                  src={item.coverImageUrl}
                                  alt={item.name}
                                  fill
                                  sizes="60px"
                                  className="object-cover"
                                />
                              ) : (
                                <span className="flex size-full items-center justify-center text-xs text-muted-foreground">
                                  Sem foto
                                </span>
                              )}
                            </Link>

                            <div className="flex min-w-0 flex-1 flex-col gap-1">
                              <Link
                                href={`/produto/${item.slug}`}
                                onClick={closeCart}
                                className="truncate text-sm font-medium text-foreground hover:underline"
                              >
                                {item.name}
                              </Link>
                              <p className="text-base font-bold text-primary">
                                {formatPrice(item.price)}
                              </p>
                              <button
                                type="button"
                                onClick={() => {
                                  void handleRemove(item);
                                }}
                                className="mt-0.5 self-start text-sm text-muted-foreground underline-offset-2 hover:text-destructive hover:underline"
                              >
                                Remover
                              </button>
                            </div>
                          </motion.li>
                        ))}
                      </AnimatePresence>
                    </ul>
                  )}
                </div>

                <div className="mt-auto flex flex-col gap-2 border-t border-border p-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:p-5">
                  {items.length > 0 ? (
                    <div className="mb-1 flex items-center justify-between text-lg font-bold">
                      <span>Subtotal</span>
                      <span className="text-primary">{formatPrice(subtotal)}</span>
                    </div>
                  ) : null}

                  {items.length === 0 ? (
                    <Button
                      type="button"
                      size="lg"
                      className="h-12 w-full rounded-full text-base font-bold"
                      disabled
                    >
                      Finalizar compra
                    </Button>
                  ) : (
                    <Button
                      asChild
                      size="lg"
                      className="h-12 w-full rounded-full text-base font-bold uppercase tracking-wide"
                    >
                      <Link href={checkoutHref} onClick={closeCart}>
                        Finalizar compra
                      </Link>
                    </Button>
                  )}

                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    className="h-11 w-full rounded-full border-2 border-primary text-base font-bold text-primary"
                    onClick={closeCart}
                  >
                    Continuar comprando
                  </Button>
                </div>
              </motion.div>
            </SheetPrimitive.Content>
          </SheetPrimitive.Portal>
        ) : null}
      </AnimatePresence>
    </SheetPrimitive.Root>
  );
}
