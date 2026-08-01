"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import type { ProductImage } from "@/features/catalog/types";
import { cn } from "@/lib/utils";

type ProductGalleryProps = {
  images: ProductImage[];
  productName: string;
  showUniqueBadge?: boolean;
};

/**
 * Galeria swipeable aspect 3/4 com dots (scroll-snap nativo — sem lib extra).
 */
export function ProductGallery({
  images,
  productName,
  showUniqueBadge = false,
}: ProductGalleryProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    const onScroll = () => {
      const width = el.clientWidth;
      if (width <= 0) return;
      setActiveIndex(Math.round(el.scrollLeft / width));
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  function goTo(index: number) {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTo({ left: index * el.clientWidth, behavior: "smooth" });
    setActiveIndex(index);
  }

  if (images.length === 0) {
    return (
      <div className="relative aspect-3/4 w-full bg-muted">
        {showUniqueBadge ? <UniqueBadge /> : null}
        <div className="flex size-full items-center justify-center text-sm text-muted-foreground">
          Sem foto
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <div
        ref={scrollerRef}
        className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-label={`Fotos de ${productName}`}
      >
        {images.map((image, index) => (
          <div
            key={image.id}
            className="relative aspect-3/4 w-full shrink-0 snap-center bg-muted"
          >
            <Image
              src={image.image_url}
              alt={image.alt_text?.trim() || `${productName} — foto ${index + 1}`}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover"
              priority={index === 0}
            />
          </div>
        ))}
      </div>

      {showUniqueBadge ? <UniqueBadge /> : null}

      {images.length > 1 ? (
        <div
          className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center"
          role="tablist"
          aria-label="Navegação da galeria"
        >
          {images.map((image, index) => (
            <button
              key={image.id}
              type="button"
              role="tab"
              aria-selected={index === activeIndex}
              aria-label={`Foto ${index + 1} de ${images.length}`}
              className="flex size-11 items-center justify-center"
              onClick={() => goTo(index)}
            >
              <span
                className={cn(
                  "size-2.5 rounded-full transition-colors",
                  index === activeIndex
                    ? "bg-primary"
                    : "bg-background/80 ring-1 ring-foreground/25",
                )}
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function UniqueBadge() {
  return (
    <Badge
      variant="destructive"
      className="absolute top-3 left-3 z-10 h-auto px-2.5 py-1 text-xs font-medium shadow-sm"
    >
      Peça única
    </Badge>
  );
}
