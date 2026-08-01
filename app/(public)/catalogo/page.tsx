import type { Metadata } from "next";
import { Suspense } from "react";

import { CatalogProductList } from "@/features/catalog/components/catalog-product-list";
import { ProductCardSkeletonGrid } from "@/features/catalog/components/ProductCardSkeleton";

export const metadata: Metadata = {
  title: "Catálogo — Repeti Petit",
  description:
    "Peças infantis seminovas disponíveis agora. Escolha o tamanho e reserve antes que acabe.",
};

export default function CatalogoPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-8 sm:py-10">
      <header className="mb-6 flex flex-col gap-2 sm:mb-8">
        <h1 className="font-heading text-2xl font-extrabold text-foreground sm:text-3xl">
          Catálogo
        </h1>
        <p className="max-w-xl text-sm text-muted-foreground sm:text-base">
          Peças únicas, escolhidas com carinho. Mais recentes primeiro — corre
          antes que acabe!
        </p>
      </header>

      <Suspense fallback={<ProductCardSkeletonGrid />}>
        <CatalogProductList />
      </Suspense>
    </div>
  );
}
