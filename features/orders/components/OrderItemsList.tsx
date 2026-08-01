import Image from "next/image";
import Link from "next/link";

import { formatPrice } from "@/features/catalog/format-price";
import type { PublicOrderItem } from "@/features/orders/types";

type OrderItemsListProps = {
  items: PublicOrderItem[];
};

/**
 * Lista de itens do pedido público.
 * ADAPT do Flor: sem gift_message.
 */
export function OrderItemsList({ items }: OrderItemsListProps) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nenhum item neste pedido.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {items.map((item) => {
        const nameContent = (
          <p className="truncate text-sm font-medium text-foreground">
            {item.productName}
          </p>
        );

        return (
          <li key={item.id} className="flex gap-3">
            <div className="relative size-16 shrink-0 overflow-hidden rounded-md bg-muted">
              {item.coverImageUrl ? (
                <Image
                  src={item.coverImageUrl}
                  alt={item.productName}
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
              {item.productSlug ? (
                <Link
                  href={`/produto/${item.productSlug}`}
                  className="hover:underline focus-visible:underline"
                >
                  {nameContent}
                </Link>
              ) : (
                nameContent
              )}
              <p className="text-sm text-muted-foreground">
                {item.quantity === 1
                  ? "Peça única"
                  : `${item.quantity} un.`}
              </p>
              <p className="text-sm font-medium text-primary">
                {formatPrice(item.lineTotal)}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
