"use client";

import { cn } from "@/lib/utils";

/**
 * Roteiro de narração (D135 / D137 dock) — ordem descritiva.
 * Só campos + exemplos curtos; sem textos extras.
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

export type VoiceScriptChecked = Record<string, boolean>;

type VoiceScriptTipProps = {
  checked: VoiceScriptChecked;
  onToggle: (id: string) => void;
  /** light = pré-gravação; dark = durante Gravando (dock vermelho) */
  tone?: "light" | "dark";
};

/**
 * Checklist de memória — permanece visível antes e durante a gravação (dock).
 */
export function VoiceScriptTip({
  checked,
  onToggle,
  tone = "light",
}: VoiceScriptTipProps) {
  return (
    <ul
      className={cn(
        "grid grid-cols-2 gap-2",
        tone === "dark" && "text-white",
      )}
      role="group"
      aria-label="Checklist do áudio"
    >
      {VOICE_SCRIPT_ITEMS.map((item) => {
        const on = Boolean(checked[item.id]);
        return (
          <li key={item.id}>
            <button
              type="button"
              aria-pressed={on}
              onClick={() => onToggle(item.id)}
              className={cn(
                "flex min-h-12 w-full items-center gap-2.5 rounded-2xl border px-3 py-2.5 text-left text-[14px] leading-snug transition active:scale-[0.98]",
                tone === "light" &&
                  (on
                    ? "border-[var(--brand-green)]/50 bg-[var(--brand-green)]/12 font-semibold text-foreground"
                    : "border-black/10 bg-white text-foreground/90"),
                tone === "dark" &&
                  (on
                    ? "border-white/70 bg-white/25 font-semibold"
                    : "border-white/25 bg-white/10 text-white"),
              )}
            >
              <span
                className={cn(
                  "inline-flex size-6 shrink-0 items-center justify-center rounded-md border text-[13px]",
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
