import { HeartHandshake, MapPin, Sparkles, Tag } from "lucide-react";

const TRUST_SIGNALS = [
  {
    icon: Sparkles,
    title: "Qualidade curada",
    description: "Cada peça passa pelo nosso olhar antes de ir pro site.",
  },
  {
    icon: Tag,
    title: "Preços justos",
    description: "Marcas boas sem pesar no bolso da família.",
  },
  {
    icon: HeartHandshake,
    title: "Peça única",
    description: "Quando acabar, acabou — reserve com carinho.",
  },
  {
    icon: MapPin,
    title: "Retirada em Foz",
    description: "Ou entrega na região. Sem enrolação.",
  },
] as const;

/**
 * Faixa de confiança adaptada para brechó infantil
 * (reuse-map: HomeTrustBar ADAPT — não floral).
 */
export function HomeTrustBar() {
  return (
    <section
      aria-label="Por que comprar na Repeti Petit"
      className="border-y border-border bg-muted/60"
    >
      <ul className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-4 py-8 sm:grid-cols-2 sm:gap-8 sm:px-8 sm:py-10 lg:grid-cols-4">
        {TRUST_SIGNALS.map((signal, index) => {
          const Icon = signal.icon;
          return (
            <li
              key={signal.title}
              className="flex gap-3 animate-in fade-in slide-in-from-bottom-2 fill-mode-both duration-500"
              style={{ animationDelay: `${index * 80}ms` }}
            >
              <span
                className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
                aria-hidden
              >
                <Icon className="size-5" />
              </span>
              <div className="flex min-w-0 flex-col gap-1">
                <p className="font-heading text-sm font-bold text-foreground sm:text-base">
                  {signal.title}
                </p>
                <p className="text-sm text-muted-foreground">
                  {signal.description}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
