import { Header } from "@/components/public/Header";
import { ProductCard } from "@/features/catalog/ProductCard";
import { getAvailableProducts } from "@/features/catalog/queries";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Catálogo — Repeti Petit",
};

export default async function CatalogPage() {
  const { products, error } = await getAvailableProducts();

  return (
    <>
      <Header />
      <main className="mx-auto max-w-5xl px-4 py-6">
        <h1 className="font-display text-2xl font-extrabold">Catálogo</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Peças únicas — corre antes que acabe!
        </p>

        {products.length > 0 ? (
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-dashed border-border bg-card p-8 text-center">
            <p className="font-display text-lg font-bold">
              Nenhuma peça disponível ainda
            </p>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              {error
                ? `O catálogo está conectado ao Supabase, mas o schema ainda não foi aplicado (${error}). Aplique as migrations e o seed para popular as 24 peças de desenvolvimento.`
                : "Assim que as peças forem cadastradas no admin, elas aparecem aqui."}
            </p>
          </div>
        )}
      </main>
    </>
  );
}
