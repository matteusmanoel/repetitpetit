"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

/**
 * Roteiro de narração (D135) — ordem descritiva da peça.
 * Labels incluem exemplo curto para memória; sem textos extras na UI.
 */
export const VOICE_SCRIPT_ITEMS = [
  { id: "categoria", label: "Categoria (body, calça…)" },
  { id: "marca", label: "Marca (GAP, Carters…)" },
  { id: "cor", label: "Cor (azul, floral…)" },
  { id: "tamanho", label: "Tamanho (RN/P/M/G)" },
  { id: "idade", label: "Idade (2–3a, 4–5a…)" },
  { id: "caracteristicas", label: "Detalhes (manga, botões…)" },
  { id: "condicao", label: "Condição (novo/seminovo)" },
  { id: "sexo", label: "Sexo (menino/menina/unissex)" },
  { id: "preco", label: "Preço (29,90)" },
] as const;

type VoiceScriptTipProps = {
  /** Show only while recording — not as a pre-record dialog. */
  recording: boolean;
};

/**
 * Checklist clean para marcar o que já foi falado **durante** a gravação.
 */
export function VoiceScriptTip({ recording }: VoiceScriptTipProps) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!recording) setChecked({});
  }, [recording]);

  if (!recording) return null;

  return (
    <div
      className="mx-auto w-full max-w-sm rounded-2xl bg-white/95 p-3 text-foreground shadow-lg backdrop-blur"
      role="group"
      aria-label="Checklist do áudio"
    >
      <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
        {VOICE_SCRIPT_ITEMS.map((item) => {
          const on = Boolean(checked[item.id]);
          return (
            <li key={item.id}>
              <button
                type="button"
                className={cn(
                  "flex w-full items-center gap-2 rounded-xl border px-2.5 py-2 text-left text-[12px] leading-snug transition",
                  on
                    ? "border-[var(--brand-green)]/50 bg-[var(--brand-green)]/12 font-medium text-foreground"
                    : "border-black/10 bg-white text-foreground/85",
                )}
                onClick={() =>
                  setChecked((prev) => ({ ...prev, [item.id]: !on }))
                }
                aria-pressed={on}
              >
                <span
                  className={cn(
                    "inline-flex size-4 shrink-0 items-center justify-center rounded border text-[10px]",
                    on
                      ? "border-[var(--brand-green)] bg-[var(--brand-green)] text-white"
                      : "border-muted-foreground/35",
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
    </div>
  );
}
