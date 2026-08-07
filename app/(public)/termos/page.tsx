import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Termos de uso — Repeti Petit",
  description:
    "Termos de uso do site e da compra na Repeti Petit — peça única, Sacolinha e entrega.",
};

export default function TermosPage() {
  return (
    <article className="mx-auto max-w-3xl px-6 py-10 md:py-14">
      <h1 className="font-display text-4xl text-brand-pink md:text-5xl">
        termos de uso
      </h1>
      <div className="mt-6 space-y-4 text-sm leading-relaxed text-foreground/90 md:text-base">
        <p>
          Ao usar o site da Repeti Petit você concorda com estes termos. O
          catálogo exibe peças únicas sujeitas a disponibilidade (Hold Session /
          venda em loja).
        </p>
        <p>
          Pedidos pagos entram na Sacolinha (retirada) ou seguem para entrega
          conforme escolha no checkout. Prazos e frete são informados antes do
          pagamento.
        </p>
        <p>
          É vedado uso fraudulento, abuso do sistema de reservas ou qualquer
          conduta ilegal. Podemos cancelar pedidos em caso de inconsistência ou
          suspeita de fraude.
        </p>
        <p>
          Foro: Comarca de Foz do Iguaçu/PR, leis brasileiras. Dúvidas: WhatsApp
          da loja.
        </p>
        <p className="text-xs text-muted-foreground">
          Adaptado para Repeti Petit a partir da estrutura TipTop/iFraldas —
          conteúdo próprio de brechó/e-commerce.
        </p>
      </div>
    </article>
  );
}
