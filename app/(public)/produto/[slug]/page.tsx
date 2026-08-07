import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CatalogStatusRealtime } from "@/features/catalog/components/CatalogStatusRealtime";
import { ProductAttributes } from "@/features/catalog/components/ProductAttributes";
import { ProductGallery } from "@/features/catalog/components/ProductGallery";
import { ProductPurchasePanel } from "@/features/catalog/components/ProductPurchasePanel";
import { RelatedProductsSection } from "@/features/catalog/components/RelatedProductsCarousel";
import { UniquePieceNotice } from "@/features/catalog/components/UniquePieceNotice";
import { getProductBySlug, getRelatedProducts } from "@/features/catalog/data";
import { formatPrice } from "@/features/catalog/format-price";
import { getProductReservationView } from "@/features/catalog/reservation";
import { PRODUCT_CONDITION_LABELS } from "@/features/catalog/filters";

type ProductPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    return { title: "Produto não encontrado — Repeti Petit" };
  }

  const description =
    product.description?.trim() ||
    `${product.name} — peça infantil seminova na Repeti Petit.`;

  return {
    title: `${product.name} — Repeti Petit`,
    description,
    openGraph: {
      title: product.name,
      description,
      ...(product.cover_image_url
        ? { images: [{ url: product.cover_image_url }] }
        : {}),
    },
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  const [reservation, related] = await Promise.all([
    getProductReservationView(product.id),
    getRelatedProducts({
      productId: product.id,
      sizeGroup: product.size_group,
      gender: product.gender,
      categoryId: product.category_id,
    }),
  ]);

  const isUnique = product.quantity === 1;
  const compareAt = product.compare_at_price;
  const hasCompare = compareAt != null && compareAt > product.price;

  return (
    <div className="mx-auto w-full max-w-6xl pb-4 sm:px-4 sm:pt-6 sm:pb-8">
      <CatalogStatusRealtime productId={product.id} />
      <nav
        aria-label="Breadcrumb"
        className="mb-3 hidden px-4 text-sm text-muted-foreground sm:mb-4 sm:block sm:px-0"
      >
        <Link href="/catalogo" className="hover:text-foreground">
          Catálogo
        </Link>
        <span aria-hidden className="mx-1.5">
          /
        </span>
        <span className="text-foreground">{product.name}</span>
      </nav>

      <div className="md:grid md:grid-cols-2 md:items-start md:gap-10">
        <div className="overflow-hidden sm:rounded-3xl">
          <ProductGallery
            images={product.images}
            productName={product.name}
            showUniqueBadge={isUnique}
          />
        </div>

        <div className="mt-6 space-y-5 rounded-3xl border border-border bg-card p-5 shadow-sm md:mt-0 md:p-8">
          <p className="text-xs font-bold uppercase tracking-widest text-primary">
            {isUnique ? "Peça única" : "Peça"} ·{" "}
            {PRODUCT_CONDITION_LABELS[product.condition]}
          </p>

          {isUnique ? <UniquePieceNotice /> : null}

          <h1 className="text-2xl font-bold leading-snug text-foreground md:text-3xl">
            {product.name}
          </h1>

          <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
            <span className="text-3xl font-bold text-primary md:text-4xl">
              {formatPrice(product.price)}
            </span>
            {hasCompare ? (
              <span className="text-base text-muted-foreground line-through">
                {formatPrice(compareAt)}
              </span>
            ) : null}
          </div>

          <ProductAttributes product={product} />

          {product.description?.trim() ? (
            <div className="flex flex-col gap-1.5">
              <h2 className="text-sm font-medium text-foreground">Descrição</h2>
              <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                {product.description.trim()}
              </p>
            </div>
          ) : null}

          <ProductPurchasePanel
            productId={product.id}
            name={product.name}
            slug={product.slug}
            price={product.price}
            coverImageUrl={product.cover_image_url}
            productStatus={product.status}
            reservation={reservation}
          />
        </div>
      </div>

      <RelatedProductsSection products={related} />
    </div>
  );
}
