/**
 * PROTOTYPE mock — Slice R catalog filters + search.
 * Throwaway; do not import from production features.
 */

export type ProtoGender = "menino" | "menina" | "unissex";
export type ProtoAge = "baby" | "crianca" | "kids";
export type ProtoSize =
  | "RN"
  | "3–6m"
  | "6–12m"
  | "12–18m"
  | "2–3a"
  | "4–5a"
  | "6–8a"
  | "9–12a";

export type ProtoProduct = {
  id: string;
  name: string;
  brand: string;
  size: ProtoSize;
  gender: ProtoGender;
  age: ProtoAge;
  price: number;
  available: boolean;
  condition: "novo" | "seminovo" | "bom_estado";
  hue: string;
};

export const PROTO_BRANDS = ["Zara Kids", "H&M", "TipTop", "Lilica", "Puc"] as const;

export const PROTO_PRODUCTS: ProtoProduct[] = [
  {
    id: "1",
    name: "Vestido floral linho",
    brand: "Zara Kids",
    size: "4–5a",
    gender: "menina",
    age: "crianca",
    price: 48,
    available: true,
    condition: "seminovo",
    hue: "#f9a8d4",
  },
  {
    id: "2",
    name: "Jaqueta jeans oversized",
    brand: "H&M",
    size: "6–8a",
    gender: "unissex",
    age: "crianca",
    price: 72,
    available: true,
    condition: "bom_estado",
    hue: "#93c5fd",
  },
  {
    id: "3",
    name: "Body manga longa pack",
    brand: "TipTop",
    size: "3–6m",
    gender: "menino",
    age: "baby",
    price: 28,
    available: false,
    condition: "novo",
    hue: "#86efac",
  },
  {
    id: "4",
    name: "Tênis velcro rosa",
    brand: "Lilica",
    size: "2–3a",
    gender: "menina",
    age: "crianca",
    price: 55,
    available: true,
    condition: "seminovo",
    hue: "#fda4af",
  },
  {
    id: "5",
    name: "Camisa polo piquet",
    brand: "Puc",
    size: "9–12a",
    gender: "menino",
    age: "kids",
    price: 39,
    available: true,
    condition: "bom_estado",
    hue: "#a5b4fc",
  },
  {
    id: "6",
    name: "Macacão soft cotton",
    brand: "TipTop",
    size: "6–12m",
    gender: "unissex",
    age: "baby",
    price: 34,
    available: true,
    condition: "novo",
    hue: "#fde68a",
  },
  {
    id: "7",
    name: "Saia plissada school",
    brand: "Zara Kids",
    size: "6–8a",
    gender: "menina",
    age: "crianca",
    price: 42,
    available: false,
    condition: "seminovo",
    hue: "#c4b5fd",
  },
  {
    id: "8",
    name: "Moletom capuz logo",
    brand: "H&M",
    size: "4–5a",
    gender: "menino",
    age: "crianca",
    price: 61,
    available: true,
    condition: "bom_estado",
    hue: "#67e8f9",
  },
];

export const AGE_LABELS: Record<ProtoAge, string> = {
  baby: "Baby (RN–24m)",
  crianca: "Criança (2–8a)",
  kids: "Kids+ (9–12a)",
};

export const GENDER_LABELS: Record<ProtoGender, string> = {
  menino: "Menino",
  menina: "Menina",
  unissex: "Unissex",
};

export const SIZE_OPTIONS: ProtoSize[] = [
  "RN",
  "3–6m",
  "6–12m",
  "12–18m",
  "2–3a",
  "4–5a",
  "6–8a",
  "9–12a",
];

export const PRICE_MIN = 0;
export const PRICE_MAX = 120;
