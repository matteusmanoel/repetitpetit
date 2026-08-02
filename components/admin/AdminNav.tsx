"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useFulfillmentQueue } from "@/components/admin/FulfillmentQueueProvider";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/admin", label: "Painel", match: "exact" as const },
  { href: "/admin/pedidos", label: "Pedidos", match: "prefix" as const },
  { href: "/admin/produtos", label: "Produtos", match: "prefix" as const },
  { href: "/admin/categorias", label: "Categorias", match: "prefix" as const },
  { href: "/admin/banners", label: "Banners", match: "prefix" as const },
] as const;

function isActivePath(
  pathname: string,
  href: string,
  match: "exact" | "prefix",
): boolean {
  if (match === "exact") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Nav do admin com badge da fila paid (Realtime T19).
 */
export function AdminNav() {
  const pathname = usePathname() ?? "/admin";
  const { paidCount } = useFulfillmentQueue();

  return (
    <nav
      aria-label="Navegação do admin"
      className="flex gap-1 overflow-x-auto px-4 pb-2 sm:px-8"
    >
      {NAV_ITEMS.map((item) => {
        const active = isActivePath(pathname, item.href, item.match);
        const showBadge = item.href === "/admin/pedidos" && paidCount > 0;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-sm font-medium transition-colors",
              active
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
            aria-current={active ? "page" : undefined}
          >
            {item.label}
            {showBadge ? (
              <Badge
                variant="default"
                className="min-w-5 justify-center px-1.5"
                aria-label={`${paidCount} pedidos pagos na fila`}
              >
                {paidCount}
              </Badge>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
