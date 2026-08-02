import type { Database } from "@/lib/supabase/types";

type ProductCondition = Database["public"]["Enums"]["product_condition"];
type ProductGender = Database["public"]["Enums"]["product_gender"];

/** Rótulos de condição para UI pública (pt-BR). */
export const CONDITION_LABELS: Record<ProductCondition, string> = {
  novo: "Novo",
  seminovo: "Seminovo",
  bom_estado: "Bom estado",
  com_detalhes: "Com detalhes",
};

/** Rótulos de gênero para UI pública (pt-BR). */
export const GENDER_LABELS: Record<ProductGender, string> = {
  menino: "Menino",
  menina: "Menina",
  unissex: "Unissex",
};

export function conditionLabel(condition: ProductCondition): string {
  return CONDITION_LABELS[condition];
}

export function genderLabel(gender: ProductGender): string {
  return GENDER_LABELS[gender];
}
