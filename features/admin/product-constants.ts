import type { Database } from "@/lib/supabase/types";

export type ProductStatus = Database["public"]["Enums"]["product_status"];
export type ProductCondition = Database["public"]["Enums"]["product_condition"];
export type ProductGender = Database["public"]["Enums"]["product_gender"];
export type SizeGroup = Database["public"]["Enums"]["size_group"];

export const PRODUCT_STATUSES = [
  "available",
  "reserved",
  "sold",
  "inactive",
] as const satisfies readonly ProductStatus[];

export const PRODUCT_CONDITIONS = [
  "novo",
  "seminovo",
  "bom_estado",
  "com_detalhes",
] as const satisfies readonly ProductCondition[];

export const PRODUCT_GENDERS = [
  "menino",
  "menina",
  "unissex",
] as const satisfies readonly ProductGender[];

export const SIZE_GROUPS = [
  "rn_3m",
  "3_6m",
  "6_12m",
  "12_18m",
  "18_24m",
  "2_3a",
  "4_5a",
  "6_8a",
  "9_12a",
  "13_mais",
] as const satisfies readonly SizeGroup[];

export const PRODUCT_STATUS_LABELS: Record<ProductStatus, string> = {
  available: "Disponível",
  reserved: "Reservado",
  sold: "Vendido",
  inactive: "Inativo",
};

export const PRODUCT_CONDITION_LABELS: Record<ProductCondition, string> = {
  novo: "Novo",
  seminovo: "Seminovo",
  bom_estado: "Bom estado",
  com_detalhes: "Com detalhes",
};

export const PRODUCT_GENDER_LABELS: Record<ProductGender, string> = {
  menino: "Menino",
  menina: "Menina",
  unissex: "Unissex",
};

export const SIZE_GROUP_LABELS: Record<SizeGroup, string> = {
  rn_3m: "RN a 3 meses",
  "3_6m": "3 a 6 meses",
  "6_12m": "6 a 12 meses",
  "12_18m": "12 a 18 meses",
  "18_24m": "18 a 24 meses",
  "2_3a": "2 a 3 anos",
  "4_5a": "4 a 5 anos",
  "6_8a": "6 a 8 anos",
  "9_12a": "9 a 12 anos",
  "13_mais": "13 anos ou mais",
};

/**
 * Gera um slug URL-safe a partir do nome (acentos removidos, espaços → hífen).
 */
export function slugifyProductName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

export function formatPriceBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}
