"use client";

import {
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Menu, Settings, X } from "lucide-react";

import {
  ADMIN_PRIMARY_NAV,
  ADMIN_SECONDARY_NAV,
  adminInitials,
  adminPageSubtitle,
  isAdminNavActive,
  type AdminNavItem,
} from "@/components/admin/admin-nav-config";
import { AdminNotificationsHost } from "@/components/admin/AdminNotificationsDrawer";
import { useFulfillmentQueue } from "@/components/admin/FulfillmentQueueProvider";
import { Badge } from "@/components/ui/badge";
import { BrandLogo } from "@/components/shared/BrandEmptyState";
import { signOutAction } from "@/features/admin/sign-out-action";
import type { AdminRow } from "@/features/admin/resolve-admin-session";
import { cn } from "@/lib/utils";

function PaidBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <Badge
      variant="default"
      className="min-w-5 justify-center px-1.5"
      aria-label={`${count} pedidos pagos na fila`}
    >
      {count}
    </Badge>
  );
}

function RailNavLink({
  item,
  pathname,
  paidCount,
  collapse,
}: {
  item: AdminNavItem;
  pathname: string;
  paidCount: number;
  collapse: boolean;
}) {
  const Icon = item.icon;
  const active = isAdminNavActive(pathname, item.href, item.match);
  const showBadge = item.badge === "paid" && paidCount > 0;

  return (
    <Link
      href={item.href}
      title={item.label}
      className={cn(
        "flex h-12 items-center gap-3 overflow-hidden rounded-2xl px-3 text-sm font-medium transition-colors",
        active
          ? "bg-white text-[var(--brand-blue)]"
          : "text-white hover:bg-white/15",
      )}
      aria-current={active ? "page" : undefined}
    >
      <Icon className="size-5 shrink-0" />
      <span
        className={cn(
          "flex min-w-0 items-center gap-1.5",
          collapse &&
            "translate-x-2 whitespace-nowrap opacity-0 transition-all duration-300 group-hover/rail:translate-x-0 group-hover/rail:opacity-100",
        )}
      >
        <span className="truncate">{item.label}</span>
        {showBadge ? <PaidBadge count={paidCount} /> : null}
      </span>
    </Link>
  );
}

function MenuNavLink({
  item,
  pathname,
  paidCount,
  onNavigate,
}: {
  item: AdminNavItem;
  pathname: string;
  paidCount: number;
  onNavigate: () => void;
}) {
  const Icon = item.icon;
  const active = isAdminNavActive(pathname, item.href, item.match);
  const showBadge = item.badge === "paid" && paidCount > 0;

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        "flex h-11 shrink-0 items-center gap-3 rounded-2xl px-3 text-sm font-medium",
        active
          ? "bg-white text-[#1B6BB5]"
          : "text-white hover:bg-white/15",
      )}
      aria-current={active ? "page" : undefined}
    >
      <Icon className="size-5 shrink-0" />
      <span className="flex min-w-0 items-center gap-1.5">
        <span className="truncate">{item.label}</span>
        {showBadge ? <PaidBadge count={paidCount} /> : null}
      </span>
    </Link>
  );
}

function AccountFooter({
  admin,
  tone,
  onNavigate,
}: {
  admin: AdminRow;
  tone: "rail" | "menu";
  onNavigate?: () => void;
}) {
  const collapse = tone === "rail";
  const initials = adminInitials(admin.full_name, admin.email);
  const displayName = admin.full_name?.trim() || "Admin";

  return (
    <div
      className={cn(
        "mt-auto shrink-0 space-y-1 border-t border-white/15 pt-3",
        tone === "rail" ? "px-2" : "px-0",
      )}
    >
      <div className="flex items-center gap-2 px-1">
        <div
          className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden rounded-2xl p-1.5"
          title="Perfil"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20 text-xs font-bold text-white">
            {initials}
          </span>
          <span
            className={cn(
              "min-w-0",
              collapse &&
                "translate-x-2 whitespace-nowrap opacity-0 transition-all duration-300 group-hover/rail:translate-x-0 group-hover/rail:opacity-100",
            )}
          >
            <p className="truncate text-sm font-semibold text-white">
              {displayName}
            </p>
            <p className="truncate text-[11px] text-white/70">{admin.email}</p>
          </span>
        </div>
        <Link
          href="/admin/configuracoes"
          title="Configurações"
          onClick={onNavigate}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white hover:bg-white/15"
          aria-label="Configurações"
        >
          <Settings className="size-5" />
        </Link>
      </div>
      <form action={signOutAction}>
        <button
          type="submit"
          title="Sair"
          className="flex h-11 w-full cursor-pointer items-center gap-3 overflow-hidden rounded-2xl px-3 text-sm font-semibold text-white/90 hover:bg-white/15"
        >
          <LogOut className="size-5 shrink-0" />
          <span
            className={cn(
              collapse &&
                "translate-x-2 whitespace-nowrap opacity-0 transition-all duration-300 group-hover/rail:translate-x-0 group-hover/rail:opacity-100",
            )}
          >
            Sair
          </span>
        </button>
      </form>
    </div>
  );
}

function DesktopRail({
  admin,
  pathname,
  paidCount,
}: {
  admin: AdminRow;
  pathname: string;
  paidCount: number;
}) {
  return (
    <aside
      className="group/rail sticky top-0 z-40 hidden h-screen w-16 shrink-0 flex-col overflow-hidden border-r border-black/5 bg-[var(--brand-blue)] py-4 text-white transition-[width] duration-300 ease-out hover:w-56 md:flex"
      aria-label="Navegação do admin"
    >
      <div className="mb-6 flex h-12 items-center gap-2 overflow-hidden px-3">
        <BrandLogo
          variant="mark"
          className="h-9 w-9 shrink-0 rounded-lg"
          priority
        />
        <BrandLogo className="h-8 shrink-0 brightness-0 invert opacity-0 transition-opacity duration-300 group-hover/rail:opacity-100" />
      </div>
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-2">
        {ADMIN_PRIMARY_NAV.map((item) => (
          <RailNavLink
            key={item.href}
            item={item}
            pathname={pathname}
            paidCount={paidCount}
            collapse
          />
        ))}
        <div className="my-2 border-t border-white/15" aria-hidden />
        {ADMIN_SECONDARY_NAV.map((item) => (
          <RailNavLink
            key={item.href}
            item={item}
            pathname={pathname}
            paidCount={paidCount}
            collapse
          />
        ))}
      </nav>
      <AccountFooter admin={admin} tone="rail" />
    </aside>
  );
}

function HamburgerMenu({
  open,
  setOpen,
  admin,
  pathname,
  paidCount,
}: {
  open: boolean;
  setOpen: (v: boolean) => void;
  admin: AdminRow;
  pathname: string;
  paidCount: number;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const close = () => setOpen(false);

  const panel =
    open && mounted
      ? createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            className="fixed inset-0 z-[200] flex h-[100dvh] w-screen flex-col bg-[#1B6BB5] text-white md:hidden"
          >
            <div className="flex shrink-0 items-center justify-between border-b border-white/15 px-5 py-4">
              <div>
                <BrandLogo className="h-9 brightness-0 invert" />
                <p className="mt-1 text-sm text-white/70">Admin</p>
              </div>
              <button
                type="button"
                className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-2xl bg-white/15"
                onClick={close}
                aria-label="Fechar"
              >
                <X className="size-5" />
              </button>
            </div>
            <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto p-4">
              {ADMIN_PRIMARY_NAV.map((item) => (
                <MenuNavLink
                  key={item.href}
                  item={item}
                  pathname={pathname}
                  paidCount={paidCount}
                  onNavigate={close}
                />
              ))}
              <div className="my-2 border-t border-white/15" aria-hidden />
              {ADMIN_SECONDARY_NAV.map((item) => (
                <MenuNavLink
                  key={item.href}
                  item={item}
                  pathname={pathname}
                  paidCount={paidCount}
                  onNavigate={close}
                />
              ))}
            </nav>
            <div className="shrink-0 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <AccountFooter admin={admin} tone="menu" onNavigate={close} />
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-2xl bg-white text-foreground shadow-sm ring-1 ring-black/8"
        aria-label="Menu"
        aria-expanded={open}
      >
        <Menu className="size-5" />
      </button>
      {panel}
    </div>
  );
}

function BottomBar({
  pathname,
  paidCount,
}: {
  pathname: string;
  paidCount: number;
}) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-black/5 bg-white pb-[env(safe-area-inset-bottom)] md:hidden"
      aria-label="Navegação principal do admin"
    >
      <ul className="grid grid-cols-4">
        {ADMIN_PRIMARY_NAV.map((item) => {
          const Icon = item.icon;
          const active = isAdminNavActive(pathname, item.href, item.match);
          const showBadge = item.badge === "paid" && paidCount > 0;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "relative flex w-full flex-col items-center gap-1 py-2.5 text-[11px] font-medium",
                  active
                    ? "text-[var(--brand-green)]"
                    : "text-muted-foreground",
                )}
                aria-current={active ? "page" : undefined}
              >
                <span className="relative">
                  <Icon className="size-6" />
                  {showBadge ? (
                    <span className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--brand-pink)] px-1 text-[9px] font-bold text-white">
                      {paidCount > 9 ? "9+" : paidCount}
                    </span>
                  ) : null}
                </span>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/**
 * Variant C chrome: blue hover rail (md+), bottom bar + fullscreen hamburger
 * (mobile), gray ops canvas. Consumed by AdminShell.
 */
export function AdminChrome({
  admin,
  children,
}: {
  admin: AdminRow;
  children: ReactNode;
}) {
  const pathname = usePathname() ?? "/admin";
  const { paidCount } = useFulfillmentQueue();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      <DesktopRail admin={admin} pathname={pathname} paidCount={paidCount} />

      <div className="flex min-w-0 flex-1 flex-col pb-[calc(4.25rem+env(safe-area-inset-bottom))] md:pb-0">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-black/5 bg-white/90 px-4 backdrop-blur-sm sm:px-6">
          <p className="truncate text-sm font-medium text-muted-foreground">
            {adminPageSubtitle(pathname)}
          </p>
          <div className="flex items-center gap-2">
            <AdminNotificationsHost />
            <HamburgerMenu
              open={menuOpen}
              setOpen={setMenuOpen}
              admin={admin}
              pathname={pathname}
              paidCount={paidCount}
            />
          </div>
        </header>

        <main className="flex-1 px-4 py-5 sm:px-6">{children}</main>
      </div>

      <BottomBar pathname={pathname} paidCount={paidCount} />
    </div>
  );
}
