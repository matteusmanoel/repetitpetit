"use client";

import Link from "next/link";
import { useState } from "react";

import {
  AGE_BANDS,
  type AgeBand,
  type ProductGender,
} from "@/features/catalog/filters";
import { cn } from "@/lib/utils";

const AGE_TILE_LABELS: Record<AgeBand, string> = {
  baby: "0 – 24 meses",
  crianca: "2 – 8 anos",
  kids: "9 – 12 anos",
};

/**
 * Home filter (D112 / SQ-3): sexo e idade — chips de idade só após Meninas/Meninos.
 */
export function HomeAgeFilter() {
  const [gender, setGender] = useState<ProductGender | null>(null);

  function hrefFor(band: AgeBand): string {
    const params = new URLSearchParams();
    params.set("faixa", band);
    if (gender) params.set("genero", gender);
    return `/catalogo?${params.toString()}`;
  }

  return (
    <section
      aria-labelledby="home-age-heading"
      className="mx-auto max-w-6xl px-4 py-8 md:py-10"
    >
      <h2
        id="home-age-heading"
        className="font-display text-center text-3xl text-primary md:text-4xl"
      >
        filtre por sexo e idade
      </h2>
      <div className="mt-3 flex justify-center gap-8">
        <button
          type="button"
          onClick={() => setGender("menina")}
          className={cn(
            "cursor-pointer pb-0.5 text-base font-semibold transition",
            gender === "menina"
              ? "border-b-2 border-brand-pink text-brand-pink"
              : "text-brand-blue",
          )}
        >
          Meninas
        </button>
        <button
          type="button"
          onClick={() => setGender("menino")}
          className={cn(
            "cursor-pointer pb-0.5 text-base font-semibold transition",
            gender === "menino"
              ? "border-b-2 border-brand-blue text-brand-blue"
              : "text-brand-blue/70",
          )}
        >
          Meninos
        </button>
      </div>
      {gender ? (
        <div
          className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4"
          role="group"
          aria-label={`Faixas etárias para ${gender === "menina" ? "meninas" : "meninos"}`}
        >
          {AGE_BANDS.map((band) => (
            <Link
              key={band}
              href={hrefFor(band)}
              className="font-display cursor-pointer rounded-2xl bg-primary px-3 py-4 text-center text-xl leading-tight text-primary-foreground shadow-sm transition hover:-translate-y-1 hover:shadow-lg md:rounded-3xl md:py-5 md:text-2xl"
            >
              {AGE_TILE_LABELS[band]}
            </Link>
          ))}
        </div>
      ) : (
        <p className="mt-5 text-center text-sm text-muted-foreground">
          Escolha Meninas ou Meninos para ver as faixas de idade.
        </p>
      )}
    </section>
  );
}
