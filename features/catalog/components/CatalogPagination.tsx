"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type CatalogPaginationProps = {
  page: number;
  totalPages: number;
};

/**
 * Paginação do catálogo via `?page=` (preserva filtros e busca).
 */
export function CatalogPagination({ page, totalPages }: CatalogPaginationProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (totalPages <= 1) return null;

  function hrefFor(target: number) {
    const params = new URLSearchParams(searchParams.toString());
    if (target <= 1) {
      params.delete("page");
    } else {
      params.set("page", String(target));
    }
    const qs = params.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }

  const pages = visiblePages(page, totalPages);

  return (
    <nav
      className="flex flex-wrap items-center justify-center gap-2 pt-2"
      aria-label="Paginação do catálogo"
    >
      <PaginationLink
        href={hrefFor(page - 1)}
        disabled={page <= 1}
        aria-label="Página anterior"
      >
        <ChevronLeftIcon className="size-4" aria-hidden />
        <span className="hidden sm:inline">Anterior</span>
      </PaginationLink>

      <ul className="flex items-center gap-1">
        {pages.map((entry, index) =>
          entry === "ellipsis" ? (
            <li
              key={`e-${index}`}
              className="px-1.5 text-sm text-muted-foreground"
              aria-hidden
            >
              …
            </li>
          ) : (
            <li key={entry}>
              <Link
                href={hrefFor(entry)}
                aria-label={`Página ${entry}`}
                aria-current={entry === page ? "page" : undefined}
                className={cn(
                  "inline-flex size-11 min-h-11 items-center justify-center rounded-full text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                  entry === page
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground hover:bg-muted",
                )}
                scroll
              >
                {entry}
              </Link>
            </li>
          ),
        )}
      </ul>

      <PaginationLink
        href={hrefFor(page + 1)}
        disabled={page >= totalPages}
        aria-label="Próxima página"
      >
        <span className="hidden sm:inline">Próxima</span>
        <ChevronRightIcon className="size-4" aria-hidden />
      </PaginationLink>
    </nav>
  );
}

function PaginationLink({
  href,
  disabled,
  children,
  "aria-label": ariaLabel,
}: {
  href: string;
  disabled?: boolean;
  children: ReactNode;
  "aria-label": string;
}) {
  if (disabled) {
    return (
      <span
        className="inline-flex h-11 min-h-11 cursor-not-allowed items-center gap-1 rounded-full px-3 text-sm font-medium text-muted-foreground opacity-40"
        aria-label={ariaLabel}
        aria-disabled
      >
        {children}
      </span>
    );
  }

  return (
    <Link
      href={href}
      aria-label={ariaLabel}
      className="inline-flex h-11 min-h-11 items-center gap-1 rounded-full px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      scroll
    >
      {children}
    </Link>
  );
}

/** Janela compacta de páginas com reticências. */
function visiblePages(
  current: number,
  total: number,
): Array<number | "ellipsis"> {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const result: Array<number | "ellipsis"> = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  if (start > 2) result.push("ellipsis");
  for (let p = start; p <= end; p += 1) result.push(p);
  if (end < total - 1) result.push("ellipsis");
  result.push(total);
  return result;
}
