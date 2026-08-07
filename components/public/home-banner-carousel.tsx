"use client";

import Autoplay from "embla-carousel-autoplay";
import Image from "next/image";
import Link from "next/link";
import { useMemo } from "react";

import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import type { ActiveBanner } from "@/features/banners/data";

type HomeBannerCarouselProps = {
  banners: ActiveBanner[];
};

/**
 * Hero TipTop-like (D112): full-bleed / rounded desktop, Becca headline, CTA verde.
 */
export function HomeBannerCarousel({ banners }: HomeBannerCarouselProps) {
  const autoplay = useMemo(
    () =>
      Autoplay({
        delay: 5500,
        stopOnInteraction: true,
        stopOnMouseEnter: true,
      }),
    [],
  );

  if (banners.length === 0) {
    return <BrandHeroFallback />;
  }

  return (
    <section
      aria-label="Destaques"
      className="relative mx-auto w-full max-w-6xl md:px-4 md:pt-4"
    >
      <Carousel
        opts={{ loop: banners.length > 1, align: "start" }}
        plugins={banners.length > 1 ? [autoplay] : []}
        className="w-full"
      >
        <CarouselContent className="-ml-0">
          {banners.map((banner, index) => (
            <CarouselItem key={banner.id} className="pl-0">
              <BannerSlide
                banner={banner}
                priority={index === 0}
                headingLevel={index === 0 ? "h1" : "h2"}
              />
            </CarouselItem>
          ))}
        </CarouselContent>

        {banners.length > 1 ? (
          <>
            <CarouselPrevious
              className="top-1/2 left-3 size-11 -translate-y-1/2 border-0 bg-card/90 text-foreground shadow-sm hover:bg-card disabled:opacity-40 sm:left-6"
              aria-label="Banner anterior"
            />
            <CarouselNext
              className="top-1/2 right-3 size-11 -translate-y-1/2 border-0 bg-card/90 text-foreground shadow-sm hover:bg-card disabled:opacity-40 sm:right-6"
              aria-label="Próximo banner"
            />
          </>
        ) : null}
      </Carousel>
    </section>
  );
}

function BannerSlide({
  banner,
  priority,
  headingLevel,
}: {
  banner: ActiveBanner;
  priority: boolean;
  headingLevel: "h1" | "h2";
}) {
  const hasCta = Boolean(banner.cta_href && banner.cta_label);
  const Heading = headingLevel;
  const title = banner.title ?? "peça única, história nova";

  return (
    <article className="relative aspect-[16/9] w-full overflow-hidden bg-muted md:aspect-[21/8] md:rounded-[2rem]">
      <Image
        src={banner.image_url}
        alt={banner.title ?? "Destaque Repeti Petit"}
        fill
        priority={priority}
        sizes="100vw"
        className="object-cover md:rounded-[2rem]"
      />
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/25 md:rounded-[2rem]">
        <Heading className="font-display px-4 text-center text-4xl leading-none text-white drop-shadow md:text-6xl">
          {title}
        </Heading>
        {banner.subtitle ? (
          <p className="mt-3 max-w-md px-4 text-center text-sm text-white/90 md:text-base">
            {banner.subtitle}
          </p>
        ) : null}
        <Button
          asChild
          size="lg"
          className="mt-4 h-auto rounded-full px-8 py-3 text-base font-semibold shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl md:text-lg"
        >
          <Link href={hasCta ? banner.cta_href! : "/catalogo"}>
            {hasCta ? banner.cta_label : "Ver catálogo"}
          </Link>
        </Button>
      </div>
    </article>
  );
}

function BrandHeroFallback() {
  return (
    <section
      aria-label="Repeti Petit"
      className="relative mx-auto max-w-6xl overflow-hidden md:px-4 md:pt-4"
    >
      <div className="relative flex aspect-[16/9] flex-col items-center justify-center overflow-hidden bg-primary md:aspect-[21/8] md:rounded-[2rem]">
        <div
          aria-hidden
          className="absolute inset-0 opacity-15 [background-image:radial-gradient(circle,white_1.5px,transparent_1.5px)] [background-size:24px_24px]"
        />
        <h1 className="font-display relative z-10 px-4 text-center text-4xl leading-none text-primary-foreground drop-shadow md:text-6xl">
          peça única, história nova
        </h1>
        <Button
          asChild
          size="lg"
          variant="secondary"
          className="relative z-10 mt-4 h-auto rounded-full px-8 py-3 text-base font-semibold shadow-lg md:text-lg"
        >
          <Link href="/catalogo">Ver catálogo</Link>
        </Button>
      </div>
    </section>
  );
}
