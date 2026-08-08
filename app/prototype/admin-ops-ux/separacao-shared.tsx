"use client";

import { Check } from "lucide-react";
import { useMemo, useState } from "react";

import {
  formatBRL,
  formatPurchaseWhen,
  ordersToPieces,
  type MockOrder,
  type MockPiece,
  type SeparacaoFilter,
} from "./mock-data";
import { usePrototypeState } from "./prototype-state";

const FILTERS: { id: SeparacaoFilter; label: string }[] = [
  { id: "a_separar", label: "A separar" },
  { id: "em_separacao", label: "Em separação" },
  { id: "urgente", label: "Urgente" },
  { id: "all", label: "Todos" },
];

const PAGE_SIZE = 6;

function badgeClass(badge: MockPiece["badge"]) {
  switch (badge) {
    case "a_separar":
      return "bg-[var(--brand-pink)]/15 text-[var(--brand-pink)]";
    case "em_separacao":
      return "bg-[var(--brand-blue)]/15 text-[var(--brand-blue)]";
    default:
      return "bg-muted text-muted-foreground";
  }
}

export function SeparacaoFilters() {
  const { filter, setFilter } = usePrototypeState();
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {FILTERS.map((f) => (
        <button
          key={f.id}
          type="button"
          onClick={() => setFilter(f.id)}
          className={`h-11 shrink-0 cursor-pointer rounded-2xl px-4 text-sm font-medium ${
            filter === f.id
              ? "bg-foreground text-background"
              : "bg-white text-muted-foreground shadow-sm ring-1 ring-black/5"
          }`}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}

export function filterOrders(
  orders: MockOrder[],
  filter: SeparacaoFilter,
  query: string,
): MockOrder[] {
  const q = query.trim().toLowerCase();
  return orders.filter((o) => {
    if (filter === "a_separar" && o.status !== "paid") return false;
    if (filter === "em_separacao") {
      const partial = o.items.some((i) => i.packedAt) && o.items.some((i) => !i.packedAt);
      if (!(o.status === "confirmed" || partial)) return false;
    }
    if (filter === "urgente" && !o.urgentDelivery) return false;

    if (!q) return true;
    if (o.customerName.toLowerCase().includes(q)) return true;
    if (o.code.toLowerCase().includes(q)) return true;
    return o.items.some((it) => it.name.toLowerCase().includes(q));
  });
}

export function PieceCard({
  piece,
  onCheck,
}: {
  piece: MockPiece;
  onCheck?: () => void;
}) {
  const checked = Boolean(piece.packedAt);
  return (
    <article className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="relative aspect-[3/4] bg-zinc-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={piece.image} alt="" className="h-full w-full object-cover" />
        <span
          className={`absolute left-2 top-2 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase ${badgeClass(piece.badge)}`}
        >
          {piece.badge.replace("_", " ")}
        </span>
        {piece.urgent ? (
          <span className="absolute right-2 top-2 rounded-full bg-[var(--brand-pink)] px-2.5 py-1 text-[11px] font-bold text-white">
            URGENTE
          </span>
        ) : null}
        {onCheck ? (
          <button
            type="button"
            onClick={onCheck}
            className={`absolute bottom-3 right-3 flex h-12 w-12 cursor-pointer items-center justify-center rounded-full shadow-md ${
              checked
                ? "bg-[var(--brand-green)] text-white"
                : "bg-white text-foreground"
            }`}
            aria-label={checked ? "Desmarcar separado" : "Marcar separado"}
          >
            <Check className="size-5" />
          </button>
        ) : null}
      </div>
      <div className="space-y-1 p-3">
        <p className="line-clamp-2 text-sm font-semibold leading-snug">
          {piece.name}
        </p>
        {piece.customerName ? (
          <p className="truncate text-sm font-medium">{piece.customerName}</p>
        ) : null}
        {piece.purchasedAt ? (
          <p className="text-xs text-muted-foreground">
            {formatPurchaseWhen(piece.purchasedAt)}
          </p>
        ) : null}
        <p className="text-lg font-bold text-[var(--brand-green)]">
          {formatBRL(piece.priceCents)}
        </p>
      </div>
    </article>
  );
}

export function OrderAnchor({ order }: { order: MockOrder }) {
  return (
    <div>
      <p className="text-base font-semibold leading-tight">
        {order.customerName}
      </p>
      <p className="mt-0.5 text-sm text-muted-foreground">
        {formatPurchaseWhen(order.purchasedAt)}
      </p>
      <p className="text-xs text-muted-foreground/70">{order.code}</p>
    </div>
  );
}

export function useFilteredPieces() {
  const { orders, filter } = usePrototypeState();
  const filteredOrders = filterOrders(orders, filter, "");
  return filterPiecesLegacy(ordersToPieces(filteredOrders), filter);
}

/** @deprecated grade hub — prefer order filtering */
function filterPiecesLegacy(
  pieces: MockPiece[],
  filter: SeparacaoFilter,
): MockPiece[] {
  switch (filter) {
    case "a_separar":
      return pieces.filter((p) => p.badge === "a_separar" && !p.packedAt);
    case "em_separacao":
      return pieces.filter(
        (p) => p.badge === "em_separacao" || Boolean(p.packedAt),
      );
    case "urgente":
      return pieces.filter((p) => p.urgent);
    default:
      return pieces;
  }
}

/** Split hub pieces for selected order — paginated max 6. */
export function usePagedOrderItems(orderId: string | null | undefined) {
  const { orders } = usePrototypeState();
  const [page, setPage] = useState(0);
  const order = orders.find((o) => o.id === orderId);

  const total = order?.items.length ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const items = useMemo(() => {
    if (!order) return [];
    const start = page * PAGE_SIZE;
    return order.items.slice(start, start + PAGE_SIZE);
  }, [order, page]);

  // Reset page when order changes
  const safePage = Math.min(page, pageCount - 1);
  const safeItems =
    safePage === page
      ? items
      : (order?.items.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE) ??
        []);

  return {
    order,
    items: safeItems,
    page: safePage,
    setPage,
    pageCount,
    total,
    pageSize: PAGE_SIZE,
  };
}
