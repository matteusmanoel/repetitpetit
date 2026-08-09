"use client";

import Link from "next/link";
import { useState } from "react";

import { Switch } from "@/components/ui/switch";
import { formatPrice } from "@/features/catalog/format-price";
import { cn } from "@/lib/utils";

type AdminDashboardStockCardProps = {
  quantity: number;
  value: number;
};

/**
 * Card topo do Painel — quantidade de peças disponíveis ↔ valor total de venda.
 */
export function AdminDashboardStockCard({
  quantity,
  value,
}: AdminDashboardStockCardProps) {
  const [showValue, setShowValue] = useState(false);

  return (
    <div className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium text-[var(--brand-green)]">
          Quantidade em Estoque
        </p>
        <label className="flex cursor-pointer items-center gap-2">
          <span
            className={cn(
              "text-[11px] font-medium tabular-nums",
              showValue ? "text-muted-foreground" : "text-foreground",
            )}
          >
            Peças
          </span>
          <Switch
            size="sm"
            checked={showValue}
            onCheckedChange={setShowValue}
            aria-label={
              showValue
                ? "Mostrar quantidade de peças"
                : "Mostrar valor total em estoque"
            }
          />
          <span
            className={cn(
              "text-[11px] font-medium tabular-nums",
              showValue ? "text-foreground" : "text-muted-foreground",
            )}
          >
            R$
          </span>
        </label>
      </div>

      <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums text-foreground sm:text-3xl">
        {showValue ? formatPrice(value) : quantity}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        {showValue
          ? "Valor de venda das peças disponíveis"
          : quantity === 1
            ? "1 peça disponível no catálogo"
            : `${quantity} peças disponíveis no catálogo`}
      </p>

      <Link
        href="/admin/produtos?status=available"
        className="mt-3 inline-flex text-sm font-medium text-[var(--brand-blue)] transition-colors hover:underline"
      >
        Ver no acervo
      </Link>
    </div>
  );
}
