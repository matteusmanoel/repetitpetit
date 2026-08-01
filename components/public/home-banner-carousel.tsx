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
    <section aria-label="Destaques" className="relative w-full">
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
              className="top-[28%] left-3 size-11 -translate-y-1/2 border-0 bg-card/90 text-foreground shadow-sm hover:bg-card disabled:opacity-40 sm:left-6"
              aria-label="Banner anterior"
            />
            <CarouselNext
              className="top-[28%] right-3 size-11 -translate-y-1/2 border-0 bg-card/90 text-foreground shadow-sm hover:bg-card disabled:opacity-40 sm:right-6"
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
  const title = banner.title ?? "Brechó infantil em Foz";
  const subtitle =
    banner.subtitle ??
    "Peças únicas, escolhidas com carinho. Reserve e finalize sem precisar mandar mensagem.";

  return (
    <article className="flex w-full flex-col bg-[linear-gradient(180deg,hsl(60_20%_98%)_0%,hsl(210_77%_37%/0.06)_100%)]">
      <div className="relative aspect-5/4 w-full overflow-hidden bg-muted sm:aspect-21/9">
        <Image
          src={banner.image_url}
          alt={banner.title ?? "Destaque Repeti Petit"}
          fill
          priority={priority}
          sizes="100vw"
          className="animate-in fade-in object-cover duration-700"
        />
      </div>

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-6 sm:gap-4 sm:px-8 sm:py-8">
        <p className="font-heading text-xs font-bold tracking-[0.18em] text-primary uppercase sm:text-sm">
          Repeti Petit · Brechó infantil
        </p>
        <Heading className="font-heading text-2xl font-extrabold tracking-tight text-foreground sm:text-4xl">
          {title}
        </Heading>
        <p className="max-w-xl text-sm text-muted-foreground sm:text-base">
          {subtitle}
        </p>
        <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center">
          <Button asChild size="lg" className="h-11 rounded-full px-6">
            <Link href={hasCta ? banner.cta_href! : "/catalogo"}>
              {hasCta ? banner.cta_label : "Ver catálogo"}
            </Link>
          </Button>
        </div>
      </div>
    </article>
  );
}

function BrandHeroFallback() {
  return (
    <section
      aria-label="Repeti Petit"
      className="relative overflow-hidden border-b border-border bg-[linear-gradient(135deg,hsl(60_20%_98%)_0%,hsl(210_77%_37%/0.1)_50%,hsl(76_51%_46%/0.14)_100%)]"
    >
      <div className="relative mx-auto flex min-h-[70vw] max-w-6xl flex-col justify-end gap-4 px-4 py-10 sm:min-h-[420px] sm:px-8 sm:py-16">
        <Image
          src="/brand/logo.png"
          alt="Repeti Petit"
          width={335}
          height={597}
          priority
          className="h-16 w-auto sm:h-20"
        />
        <p className="font-heading text-sm font-bold tracking-[0.18em] text-primary uppercase">
          Brechó infantil
        </p>
        <h1 className="font-heading max-w-lg text-3xl font-extrabold tracking-tight text-foreground sm:text-5xl">
          Roupinhas com história para novas aventuras
        </h1>
        <p className="max-w-md text-base text-muted-foreground sm:text-lg">
          Escolha o tamanho e reserve antes que acabe.
        </p>
        <div className="pt-2">
          <Button asChild size="lg" className="h-11 rounded-full px-6">
            <Link href="/catalogo">Ver catálogo</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
