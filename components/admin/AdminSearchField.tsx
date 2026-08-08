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
 * Padrão visual da busca Separação (SS-8) — h-14 rounded-2xl.
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
        "h-14 w-full rounded-2xl border border-black/10 bg-white px-4 text-base shadow-sm",
        className,
      )}
    />
  );
}
