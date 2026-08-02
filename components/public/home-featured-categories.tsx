import Image from "next/image";
import Link from "next/link";

import type { ActiveCategory } from "@/features/categories/data";
import { cn } from "@/lib/utils";

type HomeFeaturedCategoriesProps = {
  categories: ActiveCategory[];
};

const TILE_TONES = [
  "bg-primary/10 text-primary",
  "bg-secondary/20 text-foreground",
  "bg-destructive/10 text-destructive",
  "bg-primary/15 text-primary",
] as const;

export function HomeFeaturedCategories({
  categories,
}: HomeFeaturedCategoriesProps) {
  if (categories.length === 0) {
    return null;
  }

  return (
    <section
      aria-labelledby="home-categories-heading"
      className="w-full border-t border-border bg-muted/60"
    >
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-8 sm:py-14">
        <header className="mb-6 flex flex-col gap-2 sm:mb-8">
          <h2
            id="home-categories-heading"
            className="font-heading text-2xl font-extrabold text-foreground sm:text-3xl"
          >
            Explore por categoria
          </h2>
          <p className="max-w-xl text-sm text-muted-foreground sm:text-base">
            Encontre a peça certa sem perder tempo.
          </p>
        </header>

        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
          {categories.map((category, index) => (
            <li key={category.id}>
              <Link
                href={`/catalogo?categoria=${encodeURIComponent(category.slug)}`}
                className={cn(
                  "group relative flex min-h-28 flex-col justify-end overflow-hidden rounded-xl outline-none transition-transform duration-300",
                  "hover:scale-[1.02] active:scale-[1.01]",
                  "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  !category.image_url && TILE_TONES[index % TILE_TONES.length],
                )}
              >
                {category.image_url ? (
                  <>
                    <Image
                      src={category.image_url}
                      alt=""
                      fill
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <span
                      aria-hidden
                      className="absolute inset-0 bg-linear-to-t from-foreground/70 via-foreground/20 to-transparent"
                    />
                    <span className="relative z-10 p-3 font-heading text-sm font-bold text-primary-foreground sm:p-4 sm:text-base">
                      {category.name}
                    </span>
                  </>
                ) : (
                  <span className="relative z-10 p-3 font-heading text-sm font-bold sm:p-4 sm:text-base">
                    {category.name}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
