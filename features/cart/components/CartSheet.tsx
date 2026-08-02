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
import { releaseReservationClient } from "@/features/cart/release-client";
import { useCartStore, type CartItem } from "@/features/cart/store";
import { formatPrice } from "@/features/catalog/format-price";
import { cn } from "@/lib/utils";

/** Abaixo desse limite o countdown do item vira coral (T7). */
const URGENT_THRESHOLD_MS = 5 * 60 * 1000;

function remainingMs(expiresAt: string, nowMs: number): number {
  const expiresMs = new Date(expiresAt).getTime();
  return Number.isNaN(expiresMs) ? 0 : expiresMs - nowMs;
}

/**
 * Carrinho deslizante da direita com countdown MM:SS por item (T14).
 * Slide-in/blur via `motion` + `AnimatePresence` sobre o `Dialog` do Radix
 * (T6/T7) — a máquina de expiração/remoção abaixo não muda.
 */
export function CartSheet() {
  const items = useCartStore((s) => s.items);
  const isOpen = useCartStore((s) => s.isOpen);
  const setOpen = useCartStore((s) => s.setOpen);
  const closeCart = useCartStore((s) => s.closeCart);
  const removeItem = useCartStore((s) => s.removeItem);
  const subtotal = useCartStore((s) => s.getSubtotal());

  const expiringRef = useRef(new Set<string>());
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => {
      setNowMs(Date.now());

      const current = useCartStore.getState().items;
      for (const item of current) {
        if (!isReservationExpired(item.expiresAt)) {
          continue;
        }
        if (expiringRef.current.has(item.productId)) {
          continue;
        }
        expiringRef.current.add(item.productId);
        removeItem(item.productId);
        toast.message(`A reserva da peça ${item.name} expirou`);
        void releaseReservationClient(item.productId).finally(() => {
          expiringRef.current.delete(item.productId);
        });
      }
    }, 1000);

    return () => window.clearInterval(id);
  }, [removeItem]);

  async function handleRemove(item: CartItem) {
    removeItem(item.productId);
    await releaseReservationClient(item.productId);
  }

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
                className="fixed inset-y-0 right-0 z-50 flex w-full flex-col gap-0 bg-popover text-sm text-popover-foreground shadow-lg sm:max-w-md"
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", stiffness: 340, damping: 34 }}
              >
                <div className="flex flex-col gap-0.5 border-b border-border p-4">
                  <SheetPrimitive.Title className="font-heading text-lg font-bold text-foreground">
                    Seu carrinho
                  </SheetPrimitive.Title>
                  <SheetPrimitive.Description className="text-sm text-muted-foreground">
                    {items.length === 0
                      ? "Nenhuma peça reservada ainda."
                      : `${items.length} ${items.length === 1 ? "peça reservada" : "peças reservadas"} — finalize antes do tempo acabar.`}
                  </SheetPrimitive.Description>
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
                        {items.map((item) => {
                          const urgent = remainingMs(item.expiresAt, nowMs) <= URGENT_THRESHOLD_MS;

                          return (
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
                                className="relative h-20 w-15 shrink-0 overflow-hidden rounded-md bg-muted"
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
                                <p className="text-sm font-medium text-primary">
                                  {formatPrice(item.price)}
                                </p>
                                <p
                                  className={cn(
                                    "font-mono text-sm tabular-nums",
                                    urgent
                                      ? "font-semibold text-destructive"
                                      : "text-foreground",
                                  )}
                                  aria-label={`Tempo restante: ${formatCountdown(item.expiresAt, nowMs)}`}
                                >
                                  {formatCountdown(item.expiresAt, nowMs)}
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
                          );
                        })}
                      </AnimatePresence>
                    </ul>
                  )}
                </div>

                <div className="mt-auto flex flex-col gap-2 border-t border-border p-4">
                  {items.length > 0 ? (
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="font-heading text-base font-bold text-foreground">
                        {formatPrice(subtotal)}
                      </span>
                    </div>
                  ) : null}

                  {items.length === 0 ? (
                    <Button
                      type="button"
                      size="lg"
                      className="h-12 w-full rounded-full text-base font-medium"
                      disabled
                    >
                      Finalizar compra
                    </Button>
                  ) : (
                    <Button
                      asChild
                      size="lg"
                      className="h-12 w-full rounded-full text-base font-medium"
                    >
                      <Link href="/checkout" onClick={closeCart}>
                        Finalizar compra
                      </Link>
                    </Button>
                  )}

                  <Button
                    type="button"
                    variant="ghost"
                    size="lg"
                    className="h-11 w-full text-base"
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
