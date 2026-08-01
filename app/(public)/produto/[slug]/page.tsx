import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AddToCartButton } from "@/features/catalog/components/AddToCartButton";
import { ProductAttributes } from "@/features/catalog/components/ProductAttributes";
import { ProductGallery } from "@/features/catalog/components/ProductGallery";
import { ProductGrid } from "@/features/catalog/components/ProductGrid";
import { ReservationIndicator } from "@/features/catalog/components/ReservationIndicator";
import { UniquePieceNotice } from "@/features/catalog/components/UniquePieceNotice";
import { getProductBySlug, getRelatedProducts } from "@/features/catalog/data";
import { formatPrice } from "@/features/catalog/format-price";
import { getProductReservationView } from "@/features/catalog/reservation";

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
    }),
  ]);

  const isUnique = product.quantity === 1;
  const compareAt = product.compare_at_price;
  const hasCompare = compareAt != null && compareAt > product.price;

  return (
    <div className="mx-auto w-full max-w-6xl pb-10 sm:px-8 sm:pt-6 sm:pb-14">
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

      <div className="lg:grid lg:grid-cols-2 lg:items-start lg:gap-10">
        <div className="sm:overflow-hidden sm:rounded-xl">
          <ProductGallery
            images={product.images}
            productName={product.name}
            showUniqueBadge={isUnique}
          />
        </div>

        <div className="flex flex-col gap-5 px-4 pt-5 sm:px-0 sm:pt-0 lg:sticky lg:top-24">
          {isUnique ? <UniquePieceNotice /> : null}

          <div className="flex flex-col gap-2">
            <h1 className="font-heading text-[22px] font-bold leading-snug text-foreground sm:text-3xl">
              {product.name}
            </h1>
            <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
              <span className="text-2xl font-medium text-primary">
                {formatPrice(product.price)}
              </span>
              {hasCompare ? (
                <span className="text-base text-muted-foreground line-through">
                  {formatPrice(compareAt)}
                </span>
              ) : null}
            </div>
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

          <AddToCartButton
            productId={product.id}
            name={product.name}
            slug={product.slug}
            price={product.price}
            coverImageUrl={product.cover_image_url}
            reservation={reservation}
          />

          <ReservationIndicator reservation={reservation} />
        </div>
      </div>

      {related.length > 0 ? (
        <section className="mt-12 px-4 sm:mt-16 sm:px-0" aria-labelledby="related-heading">
          <h2
            id="related-heading"
            className="font-heading mb-4 text-xl font-bold text-foreground sm:mb-6 sm:text-2xl"
          >
            Você pode gostar
          </h2>
          <ProductGrid products={related} />
        </section>
      ) : null}
    </div>
  );
}
