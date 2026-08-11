"use client";

/**
 * Controles form-first compartilhados (intake preview + dialog produto / D144).
 */

import { Check, ChevronDown, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

export function ProtoField({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      {children}
    </div>
  );
}

export function ChipRow<T extends string>({
  options,
  value,
  onChange,
  justified = false,
}: {
  options: { id: T; label: string }[];
  value: T | null;
  onChange: (next: T) => void;
  justified?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex gap-2 [scrollbar-width:none]",
        justified
          ? "w-full justify-between"
          : "-mx-1 overflow-x-auto px-1 pb-1",
      )}
    >
      {options.map((opt) => {
        const active = opt.id === value;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={cn(
              "flex h-11 items-center justify-center rounded-full text-sm font-semibold transition",
              justified ? "min-w-0 flex-1 px-2" : "shrink-0 px-3.5",
              active
                ? "bg-[var(--brand-green)] text-white"
                : "bg-white text-foreground ring-1 ring-black/10",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export type PickOption = { id: string; label: string };

export function ListPickButton({
  label,
  valueLabel,
  options,
  onChange,
  createLabel,
  onCreate,
}: {
  label: string;
  valueLabel: string;
  options: PickOption[];
  onChange: (id: string) => void;
  /** Ação fixa no rodapé do drawer (primeiro debaixo → cima). */
  createLabel?: string;
  onCreate?: () => void;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-12 w-full items-center justify-between rounded-2xl border border-black/10 bg-white px-4 text-left text-base"
      >
        <span className="truncate">{valueLabel || label}</span>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
      </button>
      {open ? (
        <div className="fixed inset-0 z-[100] flex flex-col justify-end">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Fechar"
            onClick={() => setOpen(false)}
          />
          <div className="relative z-10 flex max-h-[50dvh] flex-col rounded-t-3xl bg-white shadow-xl">
            <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-zinc-300" />
            <div className="flex items-center justify-between px-4 py-3">
              <p className="text-base font-semibold">{label}</p>
              <button
                type="button"
                className="rounded-full p-2 hover:bg-muted"
                onClick={() => setOpen(false)}
                aria-label="Fechar"
              >
                <X className="size-5" />
              </button>
            </div>
            <ul className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2">
              {options.map((opt) => {
                const active = opt.label === valueLabel || opt.id === valueLabel;
                return (
                  <li key={opt.id}>
                    <button
                      type="button"
                      className={cn(
                        "flex h-14 w-full items-center justify-between rounded-xl px-4 text-left text-base",
                        active
                          ? "bg-[var(--brand-green)]/10 font-semibold"
                          : "hover:bg-muted",
                      )}
                      onClick={() => {
                        onChange(opt.id);
                        setOpen(false);
                      }}
                    >
                      {opt.label}
                      {active ? (
                        <Check className="size-5 text-[var(--brand-green)]" />
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
            {createLabel && onCreate ? (
              <div className="shrink-0 border-t border-black/5 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                <button
                  type="button"
                  className="flex h-12 w-full items-center justify-center rounded-xl bg-[var(--brand-green)]/10 text-base font-semibold text-[var(--brand-green)]"
                  onClick={() => {
                    setOpen(false);
                    onCreate();
                  }}
                >
                  {createLabel}
                </button>
              </div>
            ) : (
              <div className="pb-[max(0.75rem,env(safe-area-inset-bottom))]" />
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
