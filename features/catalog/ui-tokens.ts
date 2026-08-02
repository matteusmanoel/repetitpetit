import type { ProductCondition, ProductGender } from "@/features/catalog/filters";

/**
 * Classes utilitárias derivadas dos tokens de marca em `app/globals.css`
 * (docs/09-decisions.md D57). Usadas pelo `ProductCard`, PDP e pills de
 * conservação/gênero — nunca hardcodear hex nos componentes, sempre passar
 * por estes mapas para manter uma única fonte de verdade visual.
 */

/** Borda de 2px por gênero no `ProductCard`/PDP. */
export const GENDER_BORDER_CLASS: Record<ProductGender, string> = {
  menino: "border-gender-menino",
  menina: "border-gender-menina",
  unissex: "border-gender-unissex",
};

/**
 * Fundo ativo por gênero na tab de filtro (`data-[state=on]`).
 * Strings completas e literais — Tailwind v4 escaneia o texto-fonte deste
 * arquivo para gerar a classe; concatenar o variant em runtime não funciona.
 */
export const GENDER_TOGGLE_ACTIVE_CLASS: Record<ProductGender, string> = {
  menino: "data-[state=on]:bg-gender-menino",
  menina: "data-[state=on]:bg-gender-menina",
  unissex: "data-[state=on]:bg-gender-unissex",
};

/** Fundo + texto da pill de conservação. */
export const CONDITION_PILL_CLASS: Record<ProductCondition, string> = {
  novo: "bg-condition-novo text-condition-novo-foreground",
  seminovo: "bg-condition-seminovo text-condition-seminovo-foreground",
  bom_estado: "bg-condition-bom-estado text-condition-bom-estado-foreground",
  com_detalhes:
    "bg-condition-com-detalhes text-condition-com-detalhes-foreground",
};

/** Fundo suave + texto da pill de gênero na PDP (T6). */
export const GENDER_PILL_CLASS: Record<ProductGender, string> = {
  menino: "bg-gender-menino/10 text-gender-menino",
  menina: "bg-gender-menina/10 text-gender-menina",
  unissex: "bg-gender-unissex/10 text-gender-unissex",
};
