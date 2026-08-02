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
    <article className="relative aspect-4/3 w-full overflow-hidden bg-muted sm:aspect-16/9">
      <Image
        src={banner.image_url}
        alt={banner.title ?? "Destaque Repeti Petit"}
        fill
        priority={priority}
        sizes="100vw"
        className="animate-in fade-in object-cover duration-700"
      />

      {/* Scrim no terço inferior — a copy fica sobre a foto (D58). */}
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/80 via-black/35 to-transparent"
      />

      <div className="absolute inset-x-0 bottom-0 z-10 mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-6 sm:gap-3 sm:px-8 sm:py-10">
        <p className="font-heading text-xs font-bold tracking-[0.18em] text-white/90 uppercase sm:text-sm">
          Repeti Petit · Brechó infantil
        </p>
        <Heading className="font-heading text-2xl font-extrabold tracking-tight text-white drop-shadow-sm sm:text-4xl">
          {title}
        </Heading>
        <p className="max-w-xl text-sm text-white/85 sm:text-base">
          {subtitle}
        </p>
        <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center">
          <Button asChild size="lg" className="h-11 w-fit rounded-full px-6">
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
      className="relative aspect-4/3 w-full overflow-hidden bg-primary sm:aspect-16/9"
    >
      {/* Padrão geométrico (pontilhado) — sem foto de banner, nada de gradiente (D58). */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-15 [background-image:radial-gradient(circle,white_1.5px,transparent_1.5px)] [background-size:24px_24px]"
      />

      <div className="relative z-10 mx-auto flex h-full w-full max-w-6xl flex-col justify-end gap-3 px-4 py-6 sm:gap-4 sm:px-8 sm:py-10">
        <Image
          src="/brand/logo.png"
          alt="Repeti Petit"
          width={335}
          height={597}
          priority
          className="h-12 w-auto sm:h-16"
        />
        <p className="font-heading text-xs font-bold tracking-[0.18em] text-primary-foreground/85 uppercase sm:text-sm">
          Brechó infantil
        </p>
        <h1 className="font-heading max-w-lg text-2xl font-extrabold tracking-tight text-primary-foreground sm:text-4xl">
          Roupinhas com história para novas aventuras
        </h1>
        <p className="max-w-md text-sm text-primary-foreground/85 sm:text-base">
          Escolha o tamanho e reserve antes que acabe.
        </p>
        <div className="pt-1">
          <Button
            asChild
            size="lg"
            variant="secondary"
            className="h-11 w-fit rounded-full px-6"
          >
            <Link href="/catalogo">Ver catálogo</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
