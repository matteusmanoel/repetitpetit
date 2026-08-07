import type { ComponentType, SVGProps } from "react";
import {
  Baby,
  CloudRain,
  Footprints,
  Gem,
  HeartHandshake,
  Percent,
  Shirt,
} from "lucide-react";

export type NavTone = "neutro" | "menino" | "menina" | "promo";

export type StorefrontNavItem = {
  name: string;
  href: string;
  icon: ComponentType<SVGProps<SVGSVGElement> & { className?: string }>;
  tone: NavTone;
};

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
    tone: "neutro",
  },
  {
    name: "Calçados",
    href: "/catalogo",
    icon: Footprints,
    tone: "neutro",
  },
  {
    name: "Casacos",
    href: "/catalogo",
    icon: CloudRain,
    tone: "neutro",
  },
  {
    name: "Desapegue",
    href: "/desapegue",
    icon: HeartHandshake,
    tone: "neutro",
  },
  {
    name: "Promoções",
    href: "/catalogo",
    icon: Percent,
    tone: "promo",
  },
];

export function navToneClass(tone: NavTone): string {
  if (tone === "menino") return "text-brand-blue";
  if (tone === "menina" || tone === "promo") return "text-brand-pink";
  return "text-brand-green";
}
