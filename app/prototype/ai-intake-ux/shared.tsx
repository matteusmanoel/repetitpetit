"use client";

/**
 * PROTOTYPE — fake admin chrome so sticky CTAs can be judged vs bottom nav.
 */

import {
  BarChart3,
  Bell,
  Boxes,
  Camera,
  LayoutGrid,
  Menu,
} from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function ProtoAdminShell({
  title = "Cadastro em massa",
  children,
  hideChrome = false,
}: {
  title?: string;
  children: ReactNode;
  hideChrome?: boolean;
}) {
  if (hideChrome) {
    return <div className="min-h-dvh bg-zinc-100">{children}</div>;
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col bg-zinc-100">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-black/5 bg-white px-4 py-3">
        <h1 className="text-lg font-semibold tracking-tight text-foreground">
          {title}
        </h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="relative rounded-full p-2 hover:bg-muted"
            aria-label="Notificações"
          >
            <Bell className="size-5" />
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--brand-pink)] px-1 text-[10px] font-bold text-white">
              2
            </span>
          </button>
          <button
            type="button"
            className="rounded-full p-2 hover:bg-muted"
            aria-label="Menu"
          >
            <Menu className="size-5" />
          </button>
        </div>
      </header>

      <main className="relative flex min-h-0 flex-1 flex-col pb-[calc(4.25rem+env(safe-area-inset-bottom))]">
        {children}
      </main>

      <nav
        className="fixed bottom-0 left-0 right-0 z-40 mx-auto max-w-lg border-t border-black/5 bg-white pb-[env(safe-area-inset-bottom)]"
        aria-label="Navegação admin"
      >
        <ul className="grid grid-cols-4">
          <NavItem icon={LayoutGrid} label="Separação" badge="2" />
          <NavItem icon={Camera} label="Em massa" active />
          <NavItem icon={Boxes} label="Produtos" />
          <NavItem icon={BarChart3} label="Painel" />
        </ul>
      </nav>
    </div>
  );
}

function NavItem({
  icon: Icon,
  label,
  active,
  badge,
}: {
  icon: typeof Camera;
  label: string;
  active?: boolean;
  badge?: string;
}) {
  return (
    <li>
      <div
        className={cn(
          "relative flex flex-col items-center gap-0.5 py-2 text-[10px]",
          active ? "text-[var(--brand-green)]" : "text-muted-foreground",
        )}
      >
        <span className="relative">
          <Icon className="size-5" />
          {badge ? (
            <span className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--brand-pink)] px-1 text-[9px] font-bold text-white">
              {badge}
            </span>
          ) : null}
        </span>
        {label}
      </div>
    </li>
  );
}

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  cancelLabel = "Voltar",
  destructive,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/45 p-4 sm:items-center">
      <div
        role="dialog"
        aria-modal
        className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl"
      >
        <h2 className="text-base font-semibold">{title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{body}</p>
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            className="h-12 flex-1 rounded-2xl border border-border text-sm font-medium"
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={cn(
              "h-12 flex-1 rounded-2xl text-sm font-semibold text-white",
              destructive
                ? "bg-[var(--brand-pink)]"
                : "bg-[var(--brand-green)]",
            )}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function StateDebug({ payload }: { payload: unknown }) {
  return (
    <pre className="pointer-events-none fixed left-2 top-14 z-[90] max-w-[13rem] overflow-auto rounded-lg bg-black/80 p-2 font-mono text-[9px] text-lime-300 md:top-2">
      {JSON.stringify(payload, null, 0)}
    </pre>
  );
}
