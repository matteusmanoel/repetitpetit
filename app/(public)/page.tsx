import type { Metadata } from "next";

import { HomeBannerCarousel } from "@/components/public/home-banner-carousel";
import { HomeFeaturedCategories } from "@/components/public/home-featured-categories";
import { HomeLatestProducts } from "@/components/public/home-latest-products";
import { HomeTrustBar } from "@/components/public/home-trust-bar";
import { LeadCapturePopup } from "@/components/public/lead-capture-popup";
import { getHomePageData } from "@/features/home/data";

export const metadata: Metadata = {
  title: "Repeti Petit — Brechó Infantil",
  description:
    "Roupinhas com história para novas aventuras. Peças únicas em Foz do Iguaçu — escolha o tamanho e reserve antes que acabe.",
};

export default async function HomePage() {
  const { banners, categories, latestProducts } = await getHomePageData();

  return (
    <div className="flex w-full flex-1 flex-col">
      <HomeBannerCarousel banners={banners} />
      <HomeTrustBar />
      <HomeFeaturedCategories categories={categories} />
      <HomeLatestProducts products={latestProducts} />
      <LeadCapturePopup />
    </div>
  );
}
