"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Bell, X } from "lucide-react";
import { toast } from "sonner";

import { useFulfillmentQueue } from "@/components/admin/FulfillmentQueueProvider";
import { BrandEmptyState } from "@/components/shared/BrandEmptyState";
import { buildAdminNotifications } from "@/features/admin/notifications/build-notifications";
import {
  dismissNotificationId,
  dismissNotificationIds,
  loadDismissedNotificationIds,
} from "@/features/admin/notifications/dismiss-storage";
import type { AdminNotification } from "@/features/admin/notifications/types";
import { cn } from "@/lib/utils";

/**
 * Bell + badge for Central de Notificações (SP-5 / D127).
 */
export function AdminNotifBell({
  className,
  open,
  count,
  onToggle,
}: {
  className?: string;
  open: boolean;
  count: number;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "relative inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-2xl bg-white text-foreground shadow-sm ring-1 ring-black/8",
        open && "ring-[var(--brand-blue)]/40",
        className,
      )}
      aria-label="Central de notificações"
      aria-expanded={open}
      aria-haspopup="dialog"
    >
      <Bell className="size-5" />
      {count > 0 ? (
        <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--brand-pink)] px-1.5 text-[11px] font-bold text-white">
          {count > 9 ? "9+" : count}
        </span>
      ) : null}
    </button>
  );
}

/**
 * Drawer compacto (stack macOS): mobile centrado, desktop top-right.
 * Fontes: fila fulfillment (entrega urgente / venda paga / Sacolinha prazo).
 */
export function AdminNotificationsHost({ className }: { className?: string }) {
  const { allQueueOrders } = useFulfillmentQueue();
  const [open, setOpen] = useState(false);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => new Set());
  const [exiting, setExiting] = useState<Set<string>>(new Set());
  const [clearing, setClearing] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    setDismissedIds(loadDismissedNotificationIds());
  }, []);

  useEffect(() => {
    if (!open) return;
    setNowMs(Date.now());
  }, [open, allQueueOrders]);

  useEffect(() => {
    if (!open) {
      setExiting(new Set());
      setClearing(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const notifications = useMemo(
    () =>
      buildAdminNotifications(allQueueOrders, {
        nowMs,
        dismissedIds,
      }),
    [allQueueOrders, dismissedIds, nowMs],
  );

  const count = notifications.length;

  async function handleClearAll() {
    if (clearing || notifications.length === 0) return;
    setClearing(true);
    toast.message("Limpando notificações…");
    for (let i = 0; i < notifications.length; i++) {
      const id = notifications[i]!.id;
      setExiting((prev) => new Set(prev).add(id));
      await new Promise((r) => setTimeout(r, 120));
    }
    await new Promise((r) => setTimeout(r, 280));
    const next = dismissNotificationIds(notifications.map((n) => n.id));
    setDismissedIds(next);
    toast.success("Tudo limpo");
    setClearing(false);
  }

  function handleDismiss(id: string) {
    setExiting((prev) => new Set(prev).add(id));
    window.setTimeout(() => {
      setDismissedIds(dismissNotificationId(id));
    }, 280);
  }

  return (
    <>
      <AdminNotifBell
        className={className}
        open={open}
        count={count}
        onToggle={() => setOpen((v) => !v)}
      />
      {open ? (
        <NotificationsDrawerPanel
          notifications={notifications}
          exiting={exiting}
          onClose={() => setOpen(false)}
          onDismiss={handleDismiss}
          onClearAll={() => void handleClearAll()}
        />
      ) : null}
    </>
  );
}

function NotificationsDrawerPanel({
  notifications,
  exiting,
  onClose,
  onDismiss,
  onClearAll,
}: {
  notifications: AdminNotification[];
  exiting: Set<string>;
  onClose: () => void;
  onDismiss: (id: string) => void;
  onClearAll: () => void;
}) {
  const empty = notifications.length === 0;

  return (
    <div className="fixed inset-0 z-[70]">
      <button
        type="button"
        className="absolute inset-0 cursor-pointer bg-black/10 md:bg-transparent"
        aria-label="Fechar notificações"
        onClick={onClose}
      />

      {/* Mobile: coluna centrada */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Central de notificações"
        className="pointer-events-none absolute inset-x-4 top-[12%] flex flex-col items-center gap-2 md:hidden"
      >
        {empty ? (
          <div className="pointer-events-auto w-full max-w-sm overflow-hidden rounded-2xl bg-white/95 shadow-lg ring-1 ring-black/5">
            <BrandEmptyState
              title="Sem notificações"
              description="Avisos de entrega urgente, vendas novas e Sacolinha aparecem aqui."
              className="py-8"
            />
          </div>
        ) : null}
        {notifications.map((n, i) => (
          <NotifCard
            key={n.id}
            n={n}
            index={i}
            exiting={exiting.has(n.id)}
            className="w-full max-w-sm"
            onDismiss={() => onDismiss(n.id)}
            onOpen={onClose}
          />
        ))}
        {!empty ? <ClearAllButton onClick={onClearAll} /> : null}
      </div>

      {/* Desktop: stack top-right */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Central de notificações"
        className="pointer-events-none absolute right-5 top-5 hidden w-[min(100%-2.5rem,22rem)] flex-col gap-2 md:flex"
      >
        {empty ? (
          <div className="pointer-events-auto overflow-hidden rounded-2xl bg-white/95 shadow-lg ring-1 ring-black/5">
            <BrandEmptyState
              title="Sem notificações"
              description="Avisos de entrega urgente, vendas novas e Sacolinha aparecem aqui."
              className="py-8"
            />
          </div>
        ) : null}
        {notifications.map((n, i) => (
          <NotifCard
            key={n.id}
            n={n}
            index={i}
            exiting={exiting.has(n.id)}
            onDismiss={() => onDismiss(n.id)}
            onOpen={onClose}
          />
        ))}
        {!empty ? <ClearAllButton onClick={onClearAll} /> : null}
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
  onOpen,
  className = "",
}: {
  n: AdminNotification;
  index: number;
  exiting: boolean;
  onDismiss: () => void;
  onOpen: () => void;
  className?: string;
}) {
  return (
    <article
      className={cn(
        "pointer-events-auto rounded-2xl bg-white/95 p-4 shadow-[0_8px_30px_rgba(0,0,0,0.12)] ring-1 ring-black/5 transition-all duration-300",
        exiting
          ? "translate-x-full opacity-0"
          : "translate-x-0 opacity-100 animate-in slide-in-from-right-8 fade-in",
        className,
      )}
      style={{ animationDelay: exiting ? undefined : `${index * 40}ms` }}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white",
            n.priority === 1
              ? "bg-[var(--brand-pink)]"
              : n.priority === 2
                ? "bg-[var(--brand-green)]"
                : "bg-[var(--brand-blue)]",
          )}
          aria-hidden
        >
          {n.priority}
        </span>
        <Link
          href={n.href}
          onClick={onOpen}
          className="min-w-0 flex-1 rounded-lg text-left outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-blue)]/40"
        >
          <p className="text-sm font-semibold leading-tight">{n.title}</p>
          <p className="mt-0.5 text-sm text-muted-foreground">{n.body}</p>
          <p className="mt-1 text-xs text-muted-foreground/80">
            {n.publicCode} · {n.at}
          </p>
        </Link>
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
