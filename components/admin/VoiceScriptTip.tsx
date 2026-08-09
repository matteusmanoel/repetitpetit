"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";

export const VOICE_SCRIPT_ITEMS = [
  { id: "categoria", label: "Categoria" },
  { id: "marca", label: "Marca" },
  { id: "cor", label: "Cor" },
  { id: "tamanho", label: "Tamanho (RN/P/M/G)" },
  { id: "idade", label: "Idade / faixa" },
  { id: "caracteristicas", label: "Características" },
  { id: "condicao", label: "Condição" },
  { id: "sexo", label: "Sexo" },
  { id: "preco", label: "Preço" },
] as const;

export function VoiceScriptTip({ visible }: { visible: boolean }) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  if (!visible) return null;

  return (
    <div
      className="absolute bottom-full left-1/2 z-20 mb-3 w-[min(100vw-2rem,20rem)] -translate-x-1/2 rounded-2xl border border-border bg-card p-3 shadow-lg"
      role="dialog"
      aria-label="Roteiro do áudio"
    >
      <p className="text-xs font-semibold text-foreground">
        Diga no áudio (marque o que já falou)
      </p>
      <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
        Categoria → marca → cor → tamanho → idade → detalhes → condição → sexo →
        preço. Omissões ficam vazias (sem chute de preço).
      </p>
      <ul className="mt-2 grid grid-cols-2 gap-1.5">
        {VOICE_SCRIPT_ITEMS.map((item) => {
          const on = Boolean(checked[item.id]);
          return (
            <li key={item.id}>
              <button
                type="button"
                className={cn(
                  "flex w-full items-center gap-1.5 rounded-lg border px-2 py-1.5 text-left text-[11px] transition",
                  on
                    ? "border-[var(--brand-green)]/40 bg-[var(--brand-green)]/10 text-foreground"
                    : "border-border bg-muted/30 text-muted-foreground",
                )}
                onClick={() =>
                  setChecked((prev) => ({ ...prev, [item.id]: !on }))
                }
              >
                <span
                  className={cn(
                    "inline-flex size-3.5 shrink-0 items-center justify-center rounded border text-[9px]",
                    on
                      ? "border-[var(--brand-green)] bg-[var(--brand-green)] text-white"
                      : "border-muted-foreground/40",
                  )}
                  aria-hidden
                >
                  {on ? "✓" : ""}
                </span>
                {item.label}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
