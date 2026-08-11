"use client";

import { Plus } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";

import { AdminProductDialog } from "@/components/admin/AdminProductDialog";
import { AdminSearchField } from "@/components/admin/AdminSearchField";
import { OverrideActionButton } from "@/components/admin/OverrideActionButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  PRODUCT_STATUS_LABELS,
  formatPriceBRL,
  type ProductStatus,
} from "@/features/admin/product-constants";
import { loadProductForDialogAction } from "@/features/admin/product-dialog-actions";
import type { AdminProductListItem } from "@/features/admin/product-queries";
import type {
  CategoryOption,
  ProductWithImages,
} from "@/features/admin/product-types";
import {
  formatCountdown,
  isReservationExpired,
} from "@/features/cart/countdown";
import { brandToast } from "@/lib/brand-toast";
import { cn } from "@/lib/utils";

const URGENT_MS = 5 * 60 * 1000;
const PAGE_SIZE = 12;

type Chip = "all" | "available" | "hold" | "sold";

type Props = {
  products: AdminProductListItem[];
  categories: CategoryOption[];
  initialQuery: string;
  initialStatus: ProductStatus | "all";
  savedFlash?: "created" | "updated" | null;
  /** Deep-link D144: abre dialog de edição. */
  initialEditId?: string | null;
  /** Deep-link D144: abre dialog create. */
  initialCreate?: boolean;
};

function useNow(tickMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), tickMs);
    return () => window.clearInterval(id);
  }, [tickMs]);
  return now;
}

function HoldTimerBadge({ expiresAt, now }: { expiresAt: string; now: number }) {
  const expired = isReservationExpired(expiresAt, now);
  const remaining = new Date(expiresAt).getTime() - now;
  const urgent = !expired && remaining <= URGENT_MS;
  const label = expired ? "00:00" : formatCountdown(expiresAt, now);

  return (
    <span
      className={cn(
        "absolute right-2 top-2 rounded-full px-2 py-1 font-mono text-[11px] font-bold shadow",
        urgent || expired
          ? "bg-destructive text-destructive-foreground"
          : "bg-amber-100 text-amber-950",
      )}
      aria-label={`Tempo restante do hold: ${label}`}
    >
      {label}
    </span>
  );
}

export function AdminProductsClient({
  products,
  categories: initialCategories,
  initialQuery,
  initialStatus,
  savedFlash = null,
  initialEditId = null,
  initialCreate = false,
}: Props) {
  const router = useRouter();
  const now = useNow();
  const [query, setQuery] = useState(initialQuery);
  const [chip, setChip] = useState<Chip>(
    initialStatus === "available" ||
      initialStatus === "hold" ||
      initialStatus === "sold"
      ? initialStatus
      : "all",
  );
  const [page, setPage] = useState(0);
  const [categories, setCategories] = useState(initialCategories);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [dialogProduct, setDialogProduct] = useState<ProductWithImages | null>(
    null,
  );
  const [loadingEdit, startEditTransition] = useTransition();

  useEffect(() => {
    if (!savedFlash) return;
    brandToast.success(
      savedFlash === "created" ? "Produto criado" : "Produto atualizado",
    );
    router.replace("/admin/produtos", { scroll: false });
  }, [savedFlash, router]);

  function clearDialogQuery() {
    router.replace("/admin/produtos", { scroll: false });
  }

  function openEdit(productId: string) {
    setDialogMode("edit");
    setDialogProduct(null);
    setDialogOpen(true);
    startEditTransition(async () => {
      const result = await loadProductForDialogAction(productId);
      if (!result.ok) {
        brandToast.error(result.error);
        setDialogOpen(false);
        clearDialogQuery();
        return;
      }
      setDialogProduct(result.product);
    });
  }

  function openCreate() {
    setDialogMode("create");
    setDialogProduct(null);
    setDialogOpen(true);
  }

  // Deep-link once from server props (?edit= | ?create=1)
  useEffect(() => {
    if (initialEditId) {
      openEdit(initialEditId);
      return;
    }
    if (initialCreate) openCreate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialEditId, initialCreate]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((product) => {
      if (chip !== "all" && product.status !== chip) return false;
      if (!q) return true;
      return (
        product.name.toLowerCase().includes(q) ||
        (product.brand?.toLowerCase().includes(q) ?? false) ||
        (product.slug?.toLowerCase().includes(q) ?? false) ||
        (product.staff_code?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [products, chip, query]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const pageItems = filtered.slice(
    safePage * PAGE_SIZE,
    safePage * PAGE_SIZE + PAGE_SIZE,
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="text-xl font-semibold text-foreground">Produtos</h1>
          <p className="text-sm text-muted-foreground">
            Holds com timer e override · cadastro em dialog
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          {/* Importação XLSX desabilitada até homologação
          <Button
            type="button"
            variant="outline"
            className="h-12 rounded-xl px-4 text-base"
            disabled
            title="Importação XLSX ainda não homologada"
            aria-disabled="true"
          >
            Importar XLSX
          </Button>
          */}
          <Button
            asChild
            className="h-12 gap-2 rounded-xl px-3 text-base sm:px-4"
            aria-label="Novo produto"
          >
            <Link href="/admin/produtos/intake-ia">
              <Plus className="size-5" />
              <span className="hidden sm:inline">Produto</span>
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <AdminSearchField
          value={query}
          onChange={(value) => {
            setQuery(value);
            setPage(0);
          }}
          placeholder="Buscar peça…"
          aria-label="Buscar peça"
          className="flex-1"
        />
        <div className="flex gap-2 overflow-x-auto">
          {(
            [
              { id: "all" as const, label: "Todos" },
              { id: "available" as const, label: "Disponível" },
              { id: "hold" as const, label: "Em hold" },
              { id: "sold" as const, label: "Vendido" },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setChip(item.id);
                setPage(0);
              }}
              className={cn(
                "h-11 shrink-0 rounded-xl px-4 text-sm font-medium transition",
                chip === item.id
                  ? "bg-foreground text-background"
                  : "bg-card text-muted-foreground shadow-sm ring-1 ring-border",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        {filtered.length} produto(s)
      </p>

      {pageItems.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
          Nenhuma peça encontrada com esses filtros.
        </div>
      ) : (
        <ul className="animate-in fade-in grid grid-cols-2 gap-3 duration-200 sm:grid-cols-3 lg:grid-cols-4">
          {pageItems.map((product) => {
            const hold = product.activeHold;
            const price = Number(product.price);
            const compareAt =
              product.compare_at_price != null
                ? Number(product.compare_at_price)
                : null;
            const hasCompare =
              compareAt != null &&
              Number.isFinite(compareAt) &&
              compareAt > price;
            return (
              <li
                key={product.id}
                className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <button
                  type="button"
                  onClick={() => openEdit(product.id)}
                  className="group relative flex w-full flex-1 flex-col text-left"
                >
                  <div className="relative aspect-[3/4] bg-muted">
                    {product.cover_image_url ? (
                      <Image
                        src={product.cover_image_url}
                        alt=""
                        fill
                        unoptimized
                        className="object-cover"
                        sizes="(max-width: 640px) 50vw, 25vw"
                      />
                    ) : null}
                    <Badge className="absolute left-2 top-2 bg-background/95 text-foreground shadow">
                      {PRODUCT_STATUS_LABELS[product.status]}
                    </Badge>
                    {product.status === "hold" && hold ? (
                      <HoldTimerBadge expiresAt={hold.expiresAt} now={now} />
                    ) : null}
                  </div>
                  <div className="flex flex-1 flex-col space-y-1 p-3">
                    {(product.size_label || product.brand) && (
                      <p className="text-sm font-semibold text-[var(--brand-blue,#1e4a7a)]">
                        {[product.size_label, product.brand]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    )}
                    <p className="line-clamp-2 min-h-[2.5rem] text-sm font-medium">
                      {product.name}
                    </p>
                    <p className="truncate text-xs font-medium text-amber-800 min-h-4">
                      {product.status === "hold"
                        ? `Hold · ${hold?.customerName ?? "sem cliente"}`
                        : "\u00a0"}
                    </p>
                    <div className="mt-auto flex items-baseline gap-2">
                      <p className="text-lg font-bold text-[var(--brand-green,#2d6a4f)]">
                        {formatPriceBRL(price)}
                      </p>
                      {hasCompare ? (
                        <span className="text-xs text-destructive line-through">
                          {formatPriceBRL(compareAt)}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </button>

                <div
                  className="mt-auto border-t border-border bg-card p-2"
                  onClick={(event) => event.stopPropagation()}
                  onKeyDown={(event) => event.stopPropagation()}
                >
                  {product.status === "hold" ? (
                    <OverrideActionButton
                      productId={product.id}
                      productStatus={product.status}
                      className="h-12 w-full rounded-xl border-0 bg-[var(--brand-pink,#e85d75)] text-sm font-bold text-white shadow-sm hover:bg-[var(--brand-pink,#e85d75)]/90 hover:text-white"
                    />
                  ) : (
                    <div className="h-12" aria-hidden />
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {filtered.length > PAGE_SIZE ? (
        <div className="flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            className="h-12 rounded-xl px-4 text-base"
            disabled={safePage <= 0}
            onClick={() => setPage((current) => Math.max(0, current - 1))}
          >
            Anterior
          </Button>
          <p className="text-sm text-muted-foreground">
            Página {safePage + 1} / {pageCount}
          </p>
          <Button
            type="button"
            variant="outline"
            className="h-12 rounded-xl px-4 text-base"
            disabled={safePage >= pageCount - 1}
            onClick={() =>
              setPage((current) => Math.min(pageCount - 1, current + 1))
            }
          >
            Próxima
          </Button>
        </div>
      ) : null}

      <AdminProductDialog
        open={dialogOpen}
        mode={dialogMode}
        product={dialogProduct}
        categories={categories}
        onCategoriesChange={setCategories}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setDialogProduct(null);
            clearDialogQuery();
          }
        }}
        loading={loadingEdit && dialogMode === "edit" && !dialogProduct}
      />
    </div>
  );
}
