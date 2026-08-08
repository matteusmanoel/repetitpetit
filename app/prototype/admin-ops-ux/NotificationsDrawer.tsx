"use client";

import { useEffect, useState } from "react";
import { Bell, X } from "lucide-react";
import { protoToast } from "./proto-toast";

import { BrandEmptyState } from "@/components/shared/BrandEmptyState";
import { usePrototypeState } from "./prototype-state";

export function NotifBell({ className = "" }: { className?: string }) {
  const { setNotifOpen, notifOpen, notifications } = usePrototypeState();
  const count = notifications.length;

  return (
    <button
      type="button"
      onClick={() => setNotifOpen(!notifOpen)}
      className={`relative inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-2xl bg-white text-foreground shadow-sm ring-1 ring-black/8 ${className}`}
      aria-label="Central de notificações"
    >
      <Bell className="size-5" />
      {count > 0 ? (
        <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--brand-pink)] px-1.5 text-[11px] font-bold text-white">
          {count}
        </span>
      ) : null}
    </button>
  );
}

/**
 * Desktop: top-right stack. Mobile: centered list.
 * Clear all: each card slides out right (staggered).
 */
export function NotificationsDrawer() {
  const {
    notifOpen,
    setNotifOpen,
    notifications,
    dismissNotif,
    clearAllNotifs,
  } = usePrototypeState();
  const [exiting, setExiting] = useState<Set<string>>(new Set());
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    if (!notifOpen) {
      setExiting(new Set());
      setClearing(false);
    }
  }, [notifOpen]);

  if (!notifOpen) return null;

  const sorted = [...notifications].sort((a, b) => a.priority - b.priority);

  async function handleClearAll() {
    if (clearing || sorted.length === 0) return;
    setClearing(true);
    protoToast.message("Limpando notificações…");
    for (let i = 0; i < sorted.length; i++) {
      const id = sorted[i]!.id;
      setExiting((prev) => new Set(prev).add(id));
      await new Promise((r) => setTimeout(r, 120));
    }
    await new Promise((r) => setTimeout(r, 280));
    clearAllNotifs();
    protoToast.success("Tudo limpo");
    setClearing(false);
  }

  return (
    <div className="fixed inset-0 z-[70]">
      <button
        type="button"
        className="absolute inset-0 cursor-pointer bg-transparent"
        aria-label="Fechar notificações"
        onClick={() => setNotifOpen(false)}
      />

      {/* Mobile: centered column */}
      <div className="pointer-events-none absolute inset-x-4 top-[12%] flex flex-col items-center gap-2 md:hidden">
        {sorted.length === 0 ? (
          <div className="pointer-events-auto w-full max-w-sm overflow-hidden rounded-2xl bg-white/95 shadow-lg ring-1 ring-black/5">
            <BrandEmptyState
              title="Sem notificações"
              description="Avisos de entrega urgente, vendas novas e Sacolinha aparecem aqui."
              className="py-8"
            />
          </div>
        ) : null}
        {sorted.map((n, i) => (
          <NotifCard
            key={n.id}
            n={n}
            index={i}
            exiting={exiting.has(n.id)}
            className="w-full max-w-sm"
            onDismiss={() => {
              setExiting((prev) => new Set(prev).add(n.id));
              window.setTimeout(() => dismissNotif(n.id), 280);
            }}
          />
        ))}
        {sorted.length > 0 ? (
          <ClearAllButton onClick={() => void handleClearAll()} />
        ) : null}
      </div>

      {/* Desktop: top-right */}
      <div className="pointer-events-none absolute right-5 top-5 hidden w-[min(100%-2.5rem,22rem)] flex-col gap-2 md:flex">
        {sorted.map((n, i) => (
          <NotifCard
            key={n.id}
            n={n}
            index={i}
            exiting={exiting.has(n.id)}
            onDismiss={() => {
              setExiting((prev) => new Set(prev).add(n.id));
              window.setTimeout(() => dismissNotif(n.id), 280);
            }}
          />
        ))}
        {sorted.length > 0 ? (
          <ClearAllButton onClick={() => void handleClearAll()} />
        ) : null}
      </div>
    </div>
  );
}

function ClearAllButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="pointer-events-auto self-center rounded-full bg-black/75 px-5 py-2.5 text-xs font-semibold text-white shadow-lg transition hover:scale-105 hover:bg-black active:scale-95 md:self-end"
    >
      Limpar tudo
    </button>
  );
}

function NotifCard({
  n,
  index,
  exiting,
  onDismiss,
  className = "",
}: {
  n: { id: string; priority: 1 | 2 | 3; title: string; body: string; at: string };
  index: number;
  exiting: boolean;
  onDismiss: () => void;
  className?: string;
}) {
  return (
    <article
      className={`pointer-events-auto rounded-2xl bg-white/95 p-4 shadow-[0_8px_30px_rgba(0,0,0,0.12)] ring-1 ring-black/5 transition-all duration-300 ${
        exiting
          ? "translate-x-full opacity-0"
          : "translate-x-0 opacity-100 animate-in slide-in-from-right-8 fade-in"
      } ${className}`}
      style={{ animationDelay: exiting ? undefined : `${index * 40}ms` }}
    >
      <div className="flex items-start gap-3">
        <span
          className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${
            n.priority === 1
              ? "bg-[var(--brand-pink)]"
              : n.priority === 2
                ? "bg-[var(--brand-green)]"
                : "bg-[var(--brand-blue)]"
          }`}
        >
          {n.priority}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-tight">{n.title}</p>
          <p className="mt-0.5 text-sm text-muted-foreground">{n.body}</p>
          <p className="mt-1 text-xs text-muted-foreground/80">{n.at}</p>
        </div>
        <button
          type="button"
          className="cursor-pointer rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
          aria-label="Dispensar"
          onClick={onDismiss}
        >
          <X className="size-4" />
        </button>
      </div>
    </article>
  );
}
