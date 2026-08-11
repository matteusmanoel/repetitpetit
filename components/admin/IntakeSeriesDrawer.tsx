"use client";

/**
 * Drawer da série do cadastro em massa — selecionar / remover peças.
 */

import { Check, Trash2, X } from "lucide-react";
import { useEffect } from "react";

import type { IntakeDraftItem } from "@/features/admin/ai-intake/schemas";
import { cn } from "@/lib/utils";

function coerceMoney(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "string") {
    const n = Number(value.replace(",", ".").trim());
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function formatMoneyDisplay(value: unknown): string {
  const n = coerceMoney(value);
  if (n === null) return "";
  return n.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function IntakeSeriesDrawer({
  open,
  items,
  activeClientId,
  onClose,
  onSelect,
  onRequestRemove,
}: {
  open: boolean;
  items: IntakeDraftItem[];
  activeClientId: string | null;
  onClose: () => void;
  onSelect: (index: number) => void;
  onRequestRemove: (clientId: string) => void;
}) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[105] flex flex-col justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Fechar"
        onClick={onClose}
      />
      <div className="relative z-10 flex max-h-[50dvh] flex-col rounded-t-3xl bg-white text-foreground shadow-xl">
        <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-zinc-300" />
        <div className="flex items-center justify-between px-4 py-3">
          <p className="text-base font-semibold">Série ({items.length} peças)</p>
          <button
            type="button"
            className="rounded-full p-2 hover:bg-muted"
            onClick={onClose}
            aria-label="Fechar"
          >
            <X className="size-5" />
          </button>
        </div>
        <ul className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {items.map((item, i) => {
            const active = item.client_id === activeClientId;
            const thumb = item.images[0]?.image_url;
            return (
              <li key={item.client_id}>
                <div
                  className={cn(
                    "flex w-full items-center gap-2 rounded-xl px-2 py-2",
                    active ? "bg-[var(--brand-green)]/10" : undefined,
                  )}
                >
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-1 py-0.5 text-left hover:opacity-90"
                    onClick={() => onSelect(i)}
                  >
                    {thumb ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={thumb}
                        alt=""
                        className="h-12 w-10 shrink-0 rounded-lg object-cover"
                      />
                    ) : (
                      <span className="flex h-12 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-[10px] text-muted-foreground">
                        —
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">
                        {i + 1}. {item.name || "Sem nome"}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        R$ {formatMoneyDisplay(item.price) || "—"} ·{" "}
                        {item.size_label || "—"}
                      </span>
                    </span>
                    {active ? (
                      <Check className="size-5 shrink-0 text-[var(--brand-green)]" />
                    ) : null}
                  </button>
                  <button
                    type="button"
                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[var(--brand-pink)] hover:bg-muted"
                    aria-label={`Remover peça ${i + 1}`}
                    onClick={() => onRequestRemove(item.client_id)}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

export function IntakeRemoveConfirm({
  open,
  itemName,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  itemName: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/45 p-4 sm:items-center">
      <div
        role="dialog"
        aria-modal
        className="w-full max-w-sm rounded-3xl bg-white p-5 text-foreground shadow-2xl"
      >
        <h2 className="text-base font-semibold">Remover da série?</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {itemName?.trim()
            ? `“${itemName.trim()}” será removida desta sessão. Não apaga nada no catálogo.`
            : "Esta peça será removida da sessão. Não apaga nada no catálogo."}
        </p>
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            className="h-12 flex-1 rounded-2xl border border-border text-sm font-medium"
            onClick={onCancel}
          >
            Voltar
          </button>
          <button
            type="button"
            className="h-12 flex-1 rounded-2xl bg-[var(--brand-pink)] text-sm font-semibold text-white"
            onClick={onConfirm}
          >
            Remover
          </button>
        </div>
      </div>
    </div>
  );
}
