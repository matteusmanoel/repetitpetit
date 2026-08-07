import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Sobre nós / FAQ — Repeti Petit",
  description:
    "Conheça a Repeti Petit: brechó infantil em Foz do Iguaçu, Sacolinha e peça única.",
};

const FAQ = [
  {
    q: "O que é a Sacolinha?",
    a: "É a bolsa das suas peças já pagas na loja. Você retira quando quiser — sem pressa no dia a dia.",
  },
  {
    q: "Preciso criar conta para comprar?",
    a: "Não. Compre como visitante. Depois do pagamento, um acesso opcional libera a área da Sacolinha.",
  },
  {
    q: "Como funciona a entrega?",
    a: "No checkout, escolha entrega, informe o endereço e só então pague. Pedidos urgentes têm prioridade na loja.",
  },
  {
    q: "As peças são únicas?",
    a: "Sim. Cada item é peça única: reservamos no Hold Session e, após o pagamento, ela entra na sua Sacolinha.",
  },
] as const;

/**
 * Sobre / FAQ soft (D112) — hero pontilhado, wave, cards coloridos, accordion.
 */
export default function SobrePage() {
  return (
    <div className="bg-brand-blue/5">
      <section className="relative overflow-hidden px-6 pb-16 pt-12 md:pt-16">
        <div className="pointer-events-none absolute inset-0 opacity-40 [background-image:radial-gradient(circle,#fff_1px,transparent_1px)] [background-size:18px_18px]" />
        <div className="relative mx-auto max-w-3xl text-center">
          <h1 className="font-display text-4xl text-brand-pink md:text-6xl">
            sobre a Repeti Petit
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-brand-blue md:text-lg">
            Brechó infantil em Foz do Iguaçu. Peças únicas, compra simples e a
            Sacolinha para retirar no seu tempo.
          </p>
          <Link
            href="/catalogo"
            className="mt-6 inline-flex cursor-pointer rounded-full bg-primary px-8 py-3 text-base font-bold text-primary-foreground shadow-md transition hover:-translate-y-0.5"
          >
            Ver catálogo
          </Link>
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-background [clip-path:ellipse(60%_100%_at_50%_100%)]" />
      </section>

      <section className="bg-background px-6 py-12">
        <h2 className="font-display text-center text-3xl text-brand-pink md:text-4xl">
          o melhor para seu petit
        </h2>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Veja como funciona
        </p>
        <div className="mx-auto mt-8 grid max-w-5xl gap-4 md:grid-cols-3">
          {(
            [
              [
                "Escolha",
                "Navegue no catálogo e reserve a peça única.",
                "bg-brand-green",
              ],
              [
                "Pague",
                "Checkout rápido — Sacolinha ou entrega.",
                "bg-brand-blue",
              ],
              [
                "Retire",
                "Sua Sacolinha espera na loja quando você puder.",
                "bg-brand-pink",
              ],
            ] as const
          ).map(([title, description, bg]) => (
            <article
              key={title}
              className={`${bg} rounded-3xl p-6 text-white shadow-md`}
            >
              <h3 className="font-display text-3xl">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed opacity-95">
                {description}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-background px-6 pb-16">
        <h2 className="font-display text-center text-3xl text-brand-pink md:text-4xl">
          dúvidas?
        </h2>
        <div className="mx-auto mt-8 max-w-2xl space-y-3">
          {FAQ.map((item) => (
            <details
              key={item.q}
              className="group rounded-2xl border border-border bg-muted/60 p-4 open:shadow-md"
            >
              <summary className="cursor-pointer list-none text-base font-bold text-brand-blue">
                {item.q}
              </summary>
              <p className="mt-2 text-sm leading-relaxed text-foreground/90">
                {item.a}
              </p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
