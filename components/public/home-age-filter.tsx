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
 * Home filter (D112 / SQ-3): sexo e idade — Meninas pré-selecionadas;
 * chips de faixa usam a cor do gênero ativo.
 */
export function HomeAgeFilter() {
  const [gender, setGender] = useState<ProductGender>("menina");

  function hrefFor(band: AgeBand): string {
    const params = new URLSearchParams();
    params.set("faixa", band);
    params.set("genero", gender);
    return `/catalogo?${params.toString()}`;
  }

  const chipClass =
    gender === "menina"
      ? "bg-brand-pink text-white hover:bg-brand-pink/90"
      : "bg-brand-blue text-white hover:bg-brand-blue/90";

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
              : "text-brand-pink/55",
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
              : "text-brand-blue/55",
          )}
        >
          Meninos
        </button>
      </div>
      <div
        className="mt-5 grid grid-cols-2 justify-items-center gap-3 md:grid-cols-3 md:gap-4"
        role="group"
        aria-label={`Faixas etárias para ${gender === "menina" ? "meninas" : "meninos"}`}
      >
        {AGE_BANDS.map((band, index) => (
          <Link
            key={band}
            href={hrefFor(band)}
            className={cn(
              "font-display w-full cursor-pointer rounded-2xl px-3 py-4 text-center text-xl leading-tight shadow-sm transition hover:-translate-y-1 hover:shadow-lg md:rounded-3xl md:py-5 md:text-2xl",
              index === AGE_BANDS.length - 1 &&
                "col-span-2 max-w-[calc(50%-0.375rem)] md:col-span-1 md:max-w-none",
              chipClass,
            )}
          >
            {AGE_TILE_LABELS[band]}
          </Link>
        ))}
      </div>
    </section>
  );
}
