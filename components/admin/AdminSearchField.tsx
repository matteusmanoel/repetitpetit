"use client";

import { cn } from "@/lib/utils";

type AdminSearchFieldProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  "aria-label"?: string;
  className?: string;
};

/**
 * Busca admin — h-12 / text-base / rounded-2xl (padrão touch admin D142).
 */
export function AdminSearchField({
  value,
  onChange,
  placeholder = "Buscar…",
  "aria-label": ariaLabel = "Buscar",
  className,
}: AdminSearchFieldProps) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      aria-label={ariaLabel}
      className={cn(
        "box-border h-12 min-h-12 w-full rounded-2xl border border-black/10 bg-white px-4 py-0 text-base leading-normal shadow-sm outline-none",
        "placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
        className,
      )}
    />
  );
}
