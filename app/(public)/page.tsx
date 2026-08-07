import type { Metadata } from "next";

import { HomeAgeFilter } from "@/components/public/home-age-filter";
import { HomeBannerCarousel } from "@/components/public/home-banner-carousel";
import { HomeLatestProducts } from "@/components/public/home-latest-products";
import { LeadCapturePopup } from "@/components/public/lead-capture-popup";
import { getHomePageData } from "@/features/home/data";

export const metadata: Metadata = {
  title: "Repeti Petit — Brechó Infantil",
  description:
    "Roupinhas com história para novas aventuras. Peças únicas em Foz do Iguaçu — escolha o tamanho e reserve antes que acabe.",
};

export default async function HomePage() {
  const { banners, latestProducts } = await getHomePageData();

  return (
    <div className="flex w-full flex-1 flex-col">
      <HomeBannerCarousel banners={banners} />
      <HomeAgeFilter />
      <HomeLatestProducts products={latestProducts} />
      <LeadCapturePopup />
    </div>
  );
}
