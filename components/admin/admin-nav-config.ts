import type { LucideIcon } from "lucide-react";
import {
  Camera,
  ChartColumn,
  Image,
  LayoutGrid,
  Package,
  Store,
} from "lucide-react";

export type AdminNavMatch = "exact" | "prefix" | "produtos" | "em-massa";

export type AdminNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  match: AdminNavMatch;
  /** Show paid-queue badge (Separação). */
  badge?: "paid";
};

/**
 * Primary destinations — Variant C / D121.
 * Same set for desktop rail, mobile bottom bar, and hamburger.
 */
export const ADMIN_PRIMARY_NAV: readonly AdminNavItem[] = [
  {
    href: "/admin/pedidos",
    label: "Separação",
    icon: LayoutGrid,
    match: "prefix",
    badge: "paid",
  },
  {
    href: "/admin/produtos/intake-ia",
    label: "Em massa",
    icon: Camera,
    match: "em-massa",
  },
  {
    href: "/admin/produtos",
    label: "Produtos",
    icon: Package,
    match: "produtos",
  },
  {
    href: "/admin",
    label: "Painel",
    icon: ChartColumn,
    match: "exact",
  },
] as const;

/**
 * Secondary destinations — rail + hamburger only (not bottom bar).
 */
export const ADMIN_SECONDARY_NAV: readonly AdminNavItem[] = [
  {
    href: "/admin/banners",
    label: "Banners",
    icon: Image,
    match: "prefix",
  },
  {
    href: "/admin/pos",
    label: "POS",
    icon: Store,
    match: "prefix",
  },
] as const;

export function isAdminNavActive(
  pathname: string,
  href: string,
  match: AdminNavMatch,
): boolean {
  if (match === "exact") return pathname === href;
  if (match === "em-massa") {
    return (
      pathname === "/admin/produtos/intake-ia" ||
      pathname.startsWith("/admin/produtos/intake-ia/")
    );
  }
  if (match === "produtos") {
    if (
      pathname === "/admin/produtos/intake-ia" ||
      pathname.startsWith("/admin/produtos/intake-ia/")
    ) {
      return false;
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Subtitle for the sticky top utility bar. */
export function adminPageSubtitle(pathname: string): string {
  if (
    pathname === "/admin/produtos/intake-ia" ||
    pathname.startsWith("/admin/produtos/intake-ia/")
  ) {
    return "Cadastro em massa";
  }
  if (pathname.startsWith("/admin/pedidos")) return "Separação";
  if (pathname.startsWith("/admin/produtos")) return "Produtos";
  if (pathname.startsWith("/admin/banners")) return "Banners";
  if (pathname.startsWith("/admin/pos")) return "POS";
  if (pathname.startsWith("/admin/override")) return "Override";
  if (pathname.startsWith("/admin/configuracoes")) return "Configurações";
  if (pathname.startsWith("/admin/categorias")) return "Categorias";
  if (pathname.startsWith("/admin/passport")) return "Passaporte";
  if (pathname === "/admin") return "Painel";
  return "Admin";
}

export function adminInitials(
  fullName: string | null,
  email: string,
): string {
  const name = fullName?.trim();
  if (name) {
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0]![0]!}${parts[parts.length - 1]![0]!}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}
