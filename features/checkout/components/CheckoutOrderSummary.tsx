"use client";

import Image from "next/image";

import type { CartItem } from "@/features/cart/store";
import { formatPrice } from "@/features/catalog/format-price";

type CheckoutOrderSummaryProps = {
  items: CartItem[];
  shippingAmount: number;
  fulfillmentLabel: string;
};

export function CheckoutOrderSummary({
  items,
  shippingAmount,
  fulfillmentLabel,
}: CheckoutOrderSummaryProps) {
  const subtotal = items.reduce((sum, item) => sum + item.price, 0);
  const total = subtotal + shippingAmount;

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col gap-3">
        {items.map((item) => (
          <li key={item.productId} className="flex gap-3">
            <div className="relative size-16 shrink-0 overflow-hidden rounded-md bg-muted">
              {item.coverImageUrl ? (
                <Image
                  src={item.coverImageUrl}
                  alt={item.name}
                  fill
                  sizes="64px"
                  className="object-cover"
                />
              ) : (
                <span className="flex size-full items-center justify-center text-xs text-muted-foreground">
                  Sem foto
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">
                {item.name}
              </p>
              <p className="text-sm text-muted-foreground">Peça única</p>
              <p className="text-sm font-medium text-primary">
                {formatPrice(item.price)}
              </p>
            </div>
          </li>
        ))}
      </ul>

      <dl className="flex flex-col gap-2 border-t border-border pt-3 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">Subtotal</dt>
          <dd className="font-medium">{formatPrice(subtotal)}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">
            Frete ({fulfillmentLabel})
          </dt>
          <dd className="font-medium">
            {shippingAmount === 0 ? "Grátis" : formatPrice(shippingAmount)}
          </dd>
        </div>
        <div className="flex justify-between gap-3 border-t border-border pt-2 text-base">
          <dt className="font-heading font-bold">Total</dt>
          <dd className="font-heading font-bold text-primary">
            {formatPrice(total)}
          </dd>
        </div>
      </dl>
    </div>
  );
}
