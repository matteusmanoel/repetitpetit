"use client";

/**
 * PROTOTYPE helpers — chips + bottom drawer meia-tela (sem Select).
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

export function ProtoInput(props: React.ComponentProps<"input">) {
  return (
    <input
      {...props}
      className={cn(
        "h-12 w-full rounded-2xl border border-black/10 bg-white px-4 text-base outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-green)]/40",
        props.className,
      )}
    />
  );
}

export function ProtoTextarea(props: React.ComponentProps<"textarea">) {
  return (
    <textarea
      {...props}
      className={cn(
        "min-h-24 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-green)]/40",
        props.className,
      )}
    />
  );
}

export function ChipRow<T extends string>({
  options,
  value,
  onChange,
  className,
  justified = false,
}: {
  options: { id: T; label: string }[] | readonly T[];
  value: T;
  onChange: (next: T) => void;
  className?: string;
  /** Distribui chips na largura total (sem scroll). */
  justified?: boolean;
}) {
  const normalized = options.map((opt) =>
    typeof opt === "string" ? { id: opt, label: opt } : opt,
  );
  return (
    <div
      className={cn(
        "flex gap-2 [scrollbar-width:none]",
        justified
          ? "w-full justify-between"
          : "-mx-1 overflow-x-auto px-1 pb-1",
        className,
      )}
    >
      {normalized.map((opt) => {
        const active = opt.id === value;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={cn(
              "flex h-11 items-center justify-center rounded-full text-sm font-semibold transition",
              justified
                ? "min-w-0 flex-1 px-2"
                : "shrink-0 px-3.5",
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

/**
 * Drawer bottom → up, max ~50vh (mobile).
 * Substitui Select longo / flip de popover.
 */
export function ListPickButton({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (next: string) => void;
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
        <span className="truncate">{value || label}</span>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
      </button>
      {open ? (
        <div className="fixed inset-0 z-[80] flex flex-col justify-end">
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
            <ul className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              {options.map((opt) => {
                const active = opt === value;
                return (
                  <li key={opt}>
                    <button
                      type="button"
                      className={cn(
                        "flex h-14 w-full items-center justify-between rounded-xl px-4 text-left text-base",
                        active
                          ? "bg-[var(--brand-green)]/10 font-semibold"
                          : "hover:bg-muted",
                      )}
                      onClick={() => {
                        onChange(opt);
                        setOpen(false);
                      }}
                    >
                      {opt}
                      {active ? (
                        <Check className="size-5 text-[var(--brand-green)]" />
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      ) : null}
    </>
  );
}

export function StateDump({ draft }: { draft: unknown }) {
  return (
    <pre className="mt-4 max-h-40 overflow-auto rounded-xl bg-zinc-900 p-3 text-[10px] leading-relaxed text-lime-300">
      {JSON.stringify(draft, null, 2)}
    </pre>
  );
}

export function ApproveBar({
  onApprove,
  label = "Confirmar peça",
}: {
  onApprove: () => void;
  label?: string;
}) {
  return (
    <div className="shrink-0 border-t border-black/5 bg-white p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <button
        type="button"
        onClick={onApprove}
        className="flex h-12 w-full items-center justify-center rounded-xl bg-[var(--brand-green)] text-base font-semibold text-white"
      >
        {label}
      </button>
    </div>
  );
}
