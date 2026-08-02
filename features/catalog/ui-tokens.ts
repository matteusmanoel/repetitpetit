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

/** Fundo + texto da pill de conservação. */
export const CONDITION_PILL_CLASS: Record<ProductCondition, string> = {
  novo: "bg-condition-novo text-condition-novo-foreground",
  seminovo: "bg-condition-seminovo text-condition-seminovo-foreground",
  bom_estado: "bg-condition-bom-estado text-condition-bom-estado-foreground",
  com_detalhes:
    "bg-condition-com-detalhes text-condition-com-detalhes-foreground",
};
