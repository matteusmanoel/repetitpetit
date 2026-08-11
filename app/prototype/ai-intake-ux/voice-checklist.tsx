"use client";

/**
 * PROTOTYPE — persistent voice checklist (memory aid during recording).
 * No instructional copy — only fields + short examples. List layout.
 */

import { cn } from "@/lib/utils";

export const SCRIPT_ITEMS = [
  { id: "categoria", label: "Categoria (body, calça…)" },
  { id: "marca", label: "Marca (GAP, Carters…)" },
  { id: "cor", label: "Cor (azul, floral…)" },
  { id: "tamanho", label: "Tamanho (RN/P/M/G)" },
  { id: "idade", label: "Idade (2–3a, 4–5a…)" },
  { id: "detalhes", label: "Detalhes (manga, botões…)" },
  { id: "condicao", label: "Condição (novo/seminovo)" },
  { id: "sexo", label: "Sexo (menino/menina/unissex)" },
  { id: "preco", label: "Preço (59,90 ou reais)" },
] as const;

export type ScriptChecked = Record<string, boolean>;

export function VoiceChecklist({
  checked,
  onToggle,
  tone = "light",
}: {
  checked: ScriptChecked;
  onToggle: (id: string) => void;
  tone?: "light" | "dark";
}) {
  return (
    <ul
      className={cn("flex flex-col gap-2", tone === "dark" && "text-white")}
      role="group"
      aria-label="Checklist do áudio"
    >
      {SCRIPT_ITEMS.map((item) => {
        const on = Boolean(checked[item.id]);
        return (
          <li key={item.id}>
            <button
              type="button"
              aria-pressed={on}
              onClick={() => onToggle(item.id)}
              className={cn(
                "flex min-h-14 w-full items-center gap-3 rounded-2xl border px-3.5 py-3 text-left text-[15px] leading-snug transition active:scale-[0.99]",
                tone === "light" &&
                  (on
                    ? "border-[var(--brand-green)]/50 bg-[var(--brand-green)]/12 font-semibold text-foreground"
                    : "border-black/10 bg-white/90 text-foreground/90"),
                tone === "dark" &&
                  (on
                    ? "border-white/70 bg-white/25 font-semibold"
                    : "border-white/25 bg-white/10 text-white"),
              )}
            >
              <span
                className={cn(
                  "inline-flex size-7 shrink-0 items-center justify-center rounded-lg border text-sm",
                  on
                    ? "border-[var(--brand-green)] bg-[var(--brand-green)] text-white"
                    : tone === "dark"
                      ? "border-white/45"
                      : "border-muted-foreground/40",
                )}
                aria-hidden
              >
                {on ? "✓" : ""}
              </span>
              <span className="min-w-0">{item.label}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
