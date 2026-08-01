"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { formatCountdown, isReservationExpired } from "@/features/cart/countdown";
import { releaseReservationClient } from "@/features/cart/release-client";
import { useCartStore, type CartItem } from "@/features/cart/store";
import { formatPrice } from "@/features/catalog/format-price";

/**
 * Carrinho deslizante da direita com countdown MM:SS por item (T14).
 */
export function CartSheet() {
  const items = useCartStore((s) => s.items);
  const isOpen = useCartStore((s) => s.isOpen);
  const setOpen = useCartStore((s) => s.setOpen);
  const closeCart = useCartStore((s) => s.closeCart);
  const removeItem = useCartStore((s) => s.removeItem);
  const subtotal = useCartStore((s) => s.getSubtotal());

  const expiringRef = useRef(new Set<string>());
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setTick((t) => t + 1);

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
    <Sheet open={isOpen} onOpenChange={setOpen}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-md"
      >
        <SheetHeader className="border-b border-border">
          <SheetTitle className="font-heading text-lg font-bold">
            Seu carrinho
          </SheetTitle>
          <SheetDescription>
            {items.length === 0
              ? "Nenhuma peça reservada ainda."
              : `${items.length} ${items.length === 1 ? "peça reservada" : "peças reservadas"} — finalize antes do tempo acabar.`}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          {items.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Explore o catálogo e reserve uma peça única.
            </p>
          ) : (
            <ul className="flex flex-col gap-4">
              {items.map((item) => (
                <li
                  key={item.productId}
                  className="flex gap-3 border-b border-border pb-4 last:border-b-0"
                >
                  <Link
                    href={`/produto/${item.slug}`}
                    onClick={closeCart}
                    className="relative size-20 shrink-0 overflow-hidden rounded-md bg-muted"
                  >
                    {item.coverImageUrl ? (
                      <Image
                        src={item.coverImageUrl}
                        alt={item.name}
                        fill
                        sizes="80px"
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
                      className="font-mono text-sm tabular-nums text-foreground"
                      aria-label={`Tempo restante: ${formatCountdown(item.expiresAt)}`}
                    >
                      {formatCountdown(item.expiresAt)}
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
                </li>
              ))}
            </ul>
          )}
        </div>

        <SheetFooter className="border-t border-border">
          {items.length > 0 ? (
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium text-foreground">
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
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
