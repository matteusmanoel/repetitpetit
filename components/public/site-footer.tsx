import { MessageCircle } from "lucide-react";
import Link from "next/link";

import { InstagramIcon } from "@/components/icons/instagram";
import { BrandLogo } from "@/components/shared/BrandEmptyState";
import { publicEnv } from "@/lib/env/public";
import { getWhatsAppUrl } from "@/lib/whatsapp";

const SOCIAL_LINKS = [
  {
    href: "https://instagram.com/repetipetit",
    label: "Instagram @repetipetit",
  },
  {
    href: "https://instagram.com/repetipetit_",
    label: "Instagram @repetipetit_",
  },
] as const;

/**
 * Soft footer TipTop-like (D112) — institucional + fale conosco em todas as rotas públicas.
 */
export function SiteFooter() {
  const whatsapp = publicEnv.NEXT_PUBLIC_STORE_WHATSAPP;
  const year = new Date().getFullYear();

  return (
    <footer className="relative mt-8 overflow-hidden bg-footer text-brand-blue">
      <div className="pointer-events-none absolute inset-x-0 -top-6 h-8 bg-background [clip-path:ellipse(55%_100%_at_50%_0%)]" />
      <div className="mx-auto grid max-w-6xl gap-8 px-6 py-12 md:grid-cols-3 md:py-16">
        <div>
          <BrandLogo className="h-auto w-[140px]" />
          <p className="mt-3 text-sm leading-relaxed text-brand-blue/80">
            Brechó infantil em Foz do Iguaçu. Peça única, Sacolinha sem pressa e
            compra simples.
          </p>
        </div>

        <div>
          <p className="font-display text-2xl text-brand-pink">institucional</p>
          <ul className="mt-3 space-y-2 text-sm font-semibold">
            <li>
              <Link href="/sobre" className="hover:underline">
                Sobre nós / FAQ
              </Link>
            </li>
            <li>
              <Link href="/privacidade" className="hover:underline">
                Política de privacidade
              </Link>
            </li>
            <li>
              <Link href="/termos" className="hover:underline">
                Termos de uso
              </Link>
            </li>
            <li>
              <Link href="/desapegue" className="hover:underline">
                Desapegue
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <p className="font-display text-2xl text-brand-pink">fale conosco</p>
          <div className="mt-3 flex gap-3">
            {SOCIAL_LINKS.map((social) => (
              <a
                key={social.href}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={social.label}
                className="flex size-11 cursor-pointer items-center justify-center rounded-full bg-card text-primary shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <InstagramIcon className="size-5" strokeWidth={1.75} />
              </a>
            ))}
            {whatsapp ? (
              <a
                href={getWhatsAppUrl(whatsapp, "Oi, preciso de ajuda!")}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="WhatsApp"
                className="flex size-11 cursor-pointer items-center justify-center rounded-full bg-card text-primary shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <MessageCircle className="size-5" />
              </a>
            ) : null}
          </div>
          <p className="mt-3 text-sm">
            Av. República Argentina, 2554 · Foz do Iguaçu, PR
          </p>
        </div>
      </div>
      <p className="border-t border-white/60 py-4 text-center text-xs text-brand-blue/70">
        © {year} Repeti Petit. Todos os direitos reservados.
      </p>
    </footer>
  );
}
