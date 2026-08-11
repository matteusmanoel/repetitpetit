import type { ComponentType, SVGProps } from "react";
import {
  Baby,
  CloudRain,
  Footprints,
  Gem,
  HeartHandshake,
  Percent,
  Shirt,
  Tags,
} from "lucide-react";

export type NavTone =
  | "menino"
  | "menina"
  | "bebe"
  | "calcados"
  | "casacos"
  | "marcas"
  | "desapegue"
  | "promo";

export type StorefrontNavItem = {
  name: string;
  href: string;
  icon: ComponentType<SVGProps<SVGSVGElement> & { className?: string }>;
  tone: NavTone;
};

/**
 * Marcas em destaque na nav "Marcas" — filtro `?marca=` (match exato no catálogo).
 * "Tommy" → Tommy Hilfiger (nome canônico no acervo).
 */
export const FEATURED_BRANDS = [
  "Carter's",
  "Paraiso",
  "Aconchego do Bebê",
  "Tip Top",
  "Milon",
  "GAP",
  "Tommy Hilfiger",
] as const;

function featuredBrandsCatalogHref(): string {
  const params = new URLSearchParams();
  params.set("marca", FEATURED_BRANDS.join(","));
  return `/catalogo?${params.toString()}`;
}

/**
 * Header category nav (D112) — texto + Lucide, não thumbnails.
 * Links usam filtros do catálogo existentes (sem inventar categorias DB).
 */
export const STOREFRONT_NAV: StorefrontNavItem[] = [
  {
    name: "Meninos",
    href: "/catalogo?genero=menino",
    icon: Shirt,
    tone: "menino",
  },
  {
    name: "Meninas",
    href: "/catalogo?genero=menina",
    icon: Gem,
    tone: "menina",
  },
  {
    name: "Bebês",
    href: "/catalogo?faixa=baby",
    icon: Baby,
    tone: "bebe",
  },
  {
    name: "Calçados",
    href: "/catalogo",
    icon: Footprints,
    tone: "calcados",
  },
  {
    name: "Casacos",
    href: "/catalogo",
    icon: CloudRain,
    tone: "casacos",
  },
  {
    name: "Marcas",
    href: featuredBrandsCatalogHref(),
    icon: Tags,
    tone: "marcas",
  },
  {
    name: "Desapegue",
    href: "/desapegue",
    icon: HeartHandshake,
    tone: "desapegue",
  },
  {
    name: "Promoções",
    href: "/catalogo",
    icon: Percent,
    tone: "promo",
  },
];

/** Cores por categoria — palette Repeti + tons auxiliares (bebê / marrom). */
export function navToneClass(tone: NavTone): string {
  switch (tone) {
    case "menino":
      return "text-brand-blue";
    case "menina":
    case "promo":
      return "text-brand-pink";
    case "bebe":
      return "text-brand-baby-blue";
    case "calcados":
      return "text-brand-brown";
    case "casacos":
      return "text-brand-green";
    case "marcas":
      return "text-brand-blue";
    case "desapegue":
      return "text-brand-green";
    default:
      return "text-brand-green";
  }
}
