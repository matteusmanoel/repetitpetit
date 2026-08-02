import Link from "next/link";

import { Button } from "@/components/ui/button";

type CatalogEmptyStateProps = {
  /** Quando true, o acervo tem peças mas os filtros não bateram. */
  filtered?: boolean;
};

export function CatalogEmptyState({ filtered = false }: CatalogEmptyStateProps) {
  if (filtered) {
    return (
      <div className="flex flex-col items-center gap-4 px-4 py-12 text-center">
        <h2 className="font-heading text-xl font-bold text-foreground sm:text-2xl">
          Nenhuma peça com esses filtros
        </h2>
        <p className="max-w-md text-sm text-muted-foreground sm:text-base">
          Tente tirar algum filtro ou ampliar a busca — o acervo muda toda
          semana.
        </p>
        <Button asChild size="lg" className="h-11">
          <Link href="/catalogo">Limpar filtros</Link>
        </Button>
      </div>
    );
  }

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
