"use client";

import { useEffect, useMemo, useState } from "react";

import { SeparacaoNextActions } from "@/components/admin/SeparacaoNextActions";
import { SeparacaoPieceCard } from "@/components/admin/SeparacaoPieceCard";
import { useFulfillmentQueue } from "@/components/admin/FulfillmentQueueProvider";
import { BrandEmptyState } from "@/components/shared/BrandEmptyState";
import { isUrgentDeliveryFulfillment } from "@/features/admin/fulfillment/queue-logic";
import {
  SEPARACAO_FILTERS,
  SEPARACAO_PAGE_SIZE,
  filterSeparacaoOrders,
  formatPurchaseWhen,
  getSeparacaoStatusLabel,
  orderAllPacked,
  packedCount,
  type SeparacaoFilter,
} from "@/features/admin/fulfillment/separacao-logic";
import { getFulfillmentLabel } from "@/features/orders/status";
import { cn } from "@/lib/utils";

/**
 * Hub Separação split (Variant C / D121 / #139):
 * lista de clientes + grade de peças do pedido selecionado.
 */
export function SeparacaoSplitHub() {
  const { allQueueOrders, isRealtimeConnected } = useFulfillmentQueue();
  const [filter, setFilter] = useState<SeparacaoFilter>("a_separar");
  const [query, setQuery] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [page, setPage] = useState(0);

  const filtered = useMemo(
    () => filterSeparacaoOrders(allQueueOrders, filter, query),
    [allQueueOrders, filter, query],
  );

  const selectedId =
    filtered.find((o) => o.id === selectedOrderId)?.id ??
    filtered[0]?.id ??
    null;

  const order = filtered.find((o) => o.id === selectedId) ?? null;

  const total = order?.items.length ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / SEPARACAO_PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const pageItems = useMemo(() => {
    if (!order) return [];
    const start = safePage * SEPARACAO_PAGE_SIZE;
    return order.items.slice(start, start + SEPARACAO_PAGE_SIZE);
  }, [order, safePage]);

  useEffect(() => {
    setPage(0);
  }, [selectedId]);

  useEffect(() => {
    if (selectedOrderId && !filtered.some((o) => o.id === selectedOrderId)) {
      setSelectedOrderId(filtered[0]?.id ?? null);
    }
  }, [filtered, selectedOrderId]);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 pb-4">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Separação
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Chips filtram clientes · busca por cliente ou peça
          {isRealtimeConnected ? " · tempo real" : ""}
        </p>
      </header>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar cliente ou produto…"
        className="h-14 w-full rounded-2xl border border-black/10 bg-white px-4 text-base shadow-sm"
        aria-label="Buscar cliente ou produto"
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {SEPARACAO_FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={cn(
                  "h-11 shrink-0 cursor-pointer rounded-2xl px-4 text-sm font-medium",
                  filter === f.id
                    ? "bg-foreground text-background"
                    : "bg-white text-muted-foreground shadow-sm ring-1 ring-black/5",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
        {order ? <SeparacaoNextActions order={order} layout="toolbar" /> : null}
      </div>

      <p className="text-sm text-muted-foreground">
        {filtered.length} cliente(s) / pedido(s)
      </p>

      <div className="grid gap-4 lg:grid-cols-[15rem_1fr]">
        <ul className="flex gap-2 overflow-x-auto pb-1 lg:block lg:max-h-[70vh] lg:space-y-2 lg:overflow-y-auto lg:pb-0">
          {filtered.map((o) => {
            const active = o.id === order?.id;
            const packed = orderAllPacked(o);
            const urgent = isUrgentDeliveryFulfillment(o.fulfillmentType);
            return (
              <li key={o.id} className="shrink-0">
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedOrderId(o.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedOrderId(o.id);
                    }
                  }}
                  className={cn(
                    "relative flex h-40 w-60 cursor-pointer flex-col overflow-hidden rounded-2xl border p-3 text-left transition outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-blue)] lg:h-40 lg:w-full",
                    packed ? "pr-12 lg:pr-3" : "",
                    active
                      ? "border-transparent bg-[var(--brand-green)] text-white shadow-md"
                      : "border-black/5 bg-white shadow-sm",
                  )}
                >
                  <SeparacaoNextActions order={o} layout="icons" />
                  <p className="truncate text-base font-semibold">
                    {o.customerName ?? "Cliente"}
                  </p>
                  <p
                    className={cn(
                      "mt-1 truncate text-sm",
                      active ? "text-white/85" : "text-muted-foreground",
                    )}
                  >
                    {formatPurchaseWhen(o.paidAt ?? o.createdAt)}
                  </p>
                  <p
                    className={cn(
                      "truncate text-xs",
                      active ? "text-white/70" : "text-muted-foreground/70",
                    )}
                  >
                    {o.publicCode}
                  </p>
                  <p
                    className={cn(
                      "mt-1 truncate text-xs font-medium",
                      active ? "text-white/90" : "text-foreground/80",
                    )}
                  >
                    {getSeparacaoStatusLabel(o.status)}
                  </p>
                  {urgent ? (
                    <span
                      className={cn(
                        "mt-auto inline-block w-fit rounded-full px-2 py-0.5 text-[11px] font-bold",
                        active
                          ? "bg-white text-[var(--brand-pink)]"
                          : "bg-[var(--brand-pink)] text-white",
                      )}
                    >
                      ENTREGA URGENTE
                    </span>
                  ) : (
                    <span className="mt-auto" />
                  )}
                  <p
                    className={cn(
                      "mt-1 text-xs",
                      active ? "text-white/80" : "text-muted-foreground",
                    )}
                  >
                    {packedCount(o)}/{o.items.length} checadas
                    {packed ? " · pronto" : ""}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>

        {order ? (
          <div>
            <p className="mb-3 text-sm text-muted-foreground">
              {getSeparacaoStatusLabel(order.status)} · {total} peça(s) ·{" "}
              {getFulfillmentLabel(order.fulfillmentType)}
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {pageItems.map((item) => (
                <SeparacaoPieceCard
                  key={item.id}
                  item={item}
                  badge={
                    order.status === "paid" ? "a_separar" : "em_separacao"
                  }
                  urgent={isUrgentDeliveryFulfillment(order.fulfillmentType)}
                />
              ))}
            </div>

            <div className="mt-4 flex items-center justify-between gap-3">
              <button
                type="button"
                disabled={safePage <= 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                className="h-11 cursor-pointer rounded-2xl bg-white px-4 text-sm font-medium shadow-sm ring-1 ring-black/5 disabled:opacity-40"
              >
                Anterior
              </button>
              <p className="text-sm text-muted-foreground">
                Página {safePage + 1} / {pageCount} · {total} total
              </p>
              <button
                type="button"
                disabled={safePage >= pageCount - 1}
                onClick={() =>
                  setPage((p) => Math.min(pageCount - 1, p + 1))
                }
                className="h-11 cursor-pointer rounded-2xl bg-white px-4 text-sm font-medium shadow-sm ring-1 ring-black/5 disabled:opacity-40"
              >
                Próxima
              </button>
            </div>
          </div>
        ) : (
          <BrandEmptyState
            title="Nenhum cliente neste filtro"
            description="Ajuste a busca ou os chips para ver pedidos a separar."
            className="rounded-2xl border border-dashed border-black/10 bg-white"
          />
        )}
      </div>
    </div>
  );
}
