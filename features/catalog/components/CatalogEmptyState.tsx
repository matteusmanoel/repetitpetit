import Link from "next/link";

import { Button } from "@/components/ui/button";

export function CatalogEmptyState() {
  return (
    <div className="flex flex-col items-center gap-4 px-4 py-16 text-center">
      <h2 className="font-heading text-xl font-bold text-foreground sm:text-2xl">
        Nenhuma peça disponível no momento
      </h2>
      <p className="max-w-md text-sm text-muted-foreground sm:text-base">
        Estamos renovando o acervo. Volte em breve ou fale com a gente pelo
        WhatsApp — sempre chega novidade.
      </p>
      <Button asChild size="lg" className="h-11">
        <Link href="/">Voltar para a página inicial</Link>
      </Button>
    </div>
  );
}
