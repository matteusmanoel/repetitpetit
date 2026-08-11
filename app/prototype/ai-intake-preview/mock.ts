/**
 * PROTOTYPE — preview do cadastro em massa (rev.2 / variante A)
 * Question: form-first + série (fotos primeiro, revisar depois)?
 */

export type ProtoCondition = "novo" | "seminovo";

export type ProtoDraft = {
  id: string;
  name: string;
  priceDisplay: string;
  size: "RN" | "P" | "M" | "G";
  brand: string;
  category: string;
  gender: "menino" | "menina" | "unissex";
  /** Default seminovo — checkbox “Novo” quando true. */
  condition: ProtoCondition;
  description: string;
  publish: boolean;
  photoUrl: string;
};

export const SERIES_DRAFTS: ProtoDraft[] = [
  {
    id: "p1",
    name: "Body manga longa Hello Kitty",
    priceDisplay: "45,00",
    size: "P",
    brand: "Paraiso",
    category: "Bodies",
    gender: "menina",
    condition: "seminovo",
    description:
      "Body soft em algodão, estampa Hello Kitty na frente. Sem marcas de uso aparentes.",
    publish: true,
    photoUrl: "https://placehold.co/600x800/f8e1e7/1a1a1a?text=1+Body",
  },
  {
    id: "p2",
    name: "Moletom Nike menino",
    priceDisplay: "65,00",
    size: "M",
    brand: "GAP",
    category: "Casacos",
    gender: "menino",
    condition: "seminovo",
    description: "Moletom felpado, capuz, pouquíssimo uso.",
    publish: true,
    photoUrl: "https://placehold.co/600x800/dbeafe/1a1a1a?text=2+Moletom",
  },
  {
    id: "p3",
    name: "Vestido floral verão",
    priceDisplay: "38,00",
    size: "G",
    brand: "Tip Top",
    category: "Vestidos",
    gender: "menina",
    condition: "novo",
    description: "Etiqueta ainda na peça. Tecido leve.",
    publish: false,
    photoUrl: "https://placehold.co/600x800/fce7f3/1a1a1a?text=3+Vestido",
  },
  {
    id: "p4",
    name: "Tênis branco 22",
    priceDisplay: "55,00",
    size: "P",
    brand: "Carter's",
    category: "Calçados",
    gender: "unissex",
    condition: "seminovo",
    description: "Sola limpa, cadarço original.",
    publish: true,
    photoUrl: "https://placehold.co/600x800/ecfccb/1a1a1a?text=4+Tenis",
  },
];

export const INITIAL_DRAFT = SERIES_DRAFTS[0]!;

export const SIZES = ["RN", "P", "M", "G"] as const;
export const GENDERS = [
  { id: "menino" as const, label: "Menino" },
  { id: "menina" as const, label: "Menina" },
  { id: "unissex" as const, label: "Unissex" },
];
export const BRANDS = [
  "Carter's",
  "Paraiso",
  "Tip Top",
  "Milon",
  "GAP",
  "Tommy Hilfiger",
  "Sem marca",
];
export const CATEGORIES = [
  "Bodies",
  "Blusas",
  "Calças",
  "Vestidos",
  "Casacos",
  "Calçados",
  "Sem categoria",
];
