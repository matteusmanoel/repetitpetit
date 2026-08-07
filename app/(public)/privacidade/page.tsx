import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de privacidade — Repeti Petit",
  description:
    "Como a Repeti Petit trata dados pessoais (LGPD) no e-commerce e na Sacolinha.",
};

export default function PrivacidadePage() {
  return (
    <article className="mx-auto max-w-3xl px-6 py-10 md:py-14">
      <h1 className="font-display text-4xl text-brand-pink md:text-5xl">
        política de privacidade
      </h1>
      <div className="mt-6 space-y-4 text-sm leading-relaxed text-foreground/90 md:text-base">
        <p>
          A Repeti Petit trata dados pessoais com cuidado (LGPD). Coletamos
          nome, e-mail, telefone e, quando necessário, endereço/CEP para entrega
          e emissão do pedido.
        </p>
        <p>
          Dados de pagamento são processados pelo Mercado Pago — não armazenamos
          número completo de cartão em nossos servidores.
        </p>
        <p>
          Usamos cookies de sessão (hold/Sacolinha) e preferências de
          recebimento. Não vendemos seus dados a terceiros.
        </p>
        <p>
          Para exercer direitos de acesso, correção ou exclusão, fale conosco
          pelo WhatsApp da loja.
        </p>
        <p className="text-xs text-muted-foreground">
          Texto adaptado ao e-commerce Repeti Petit (estrutura TipTop/iFraldas —
          conteúdo próprio de brechó).
        </p>
      </div>
    </article>
  );
}
