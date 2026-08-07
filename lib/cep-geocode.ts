/**
 * Geocode de CEP brasileiro → lat/lng.
 *
 * ViaCEP não devolve coordenadas (D118). Ordem:
 * 1. Nominatim (postalcode)
 * 2. Photon (fallback)
 *
 * Uso server-side (calculate frete / admin save). Respeita ~1 req/s Nominatim.
 */

import { normalizeCep } from "@/lib/viacep";
import type { LatLng } from "@/lib/geo/haversine";

export type CepGeocodeResult =
  | { ok: true; coords: LatLng; source: "nominatim" | "photon" }
  | { ok: false; reason: "invalid_cep" | "not_found" | "network" };

function formatCepMask(digits: string): string {
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

async function geocodeNominatim(postalCode: string): Promise<LatLng | null> {
  const masked = formatCepMask(postalCode);
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  url.searchParams.set("countrycodes", "br");
  url.searchParams.set("postalcode", masked);

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "RepetiPetitCheckout/1.0 (contato@repetipetit.com.br)",
    },
  });

  if (!response.ok) return null;

  const data = (await response.json()) as Array<{
    lat?: string;
    lon?: string;
  }>;

  const first = data[0];
  if (!first?.lat || !first?.lon) return null;

  const latitude = Number(first.lat);
  const longitude = Number(first.lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  return { latitude, longitude };
}

async function geocodePhoton(postalCode: string): Promise<LatLng | null> {
  const masked = formatCepMask(postalCode);
  const url = new URL("https://photon.komoot.io/api/");
  url.searchParams.set("q", `${masked} Brasil`);
  url.searchParams.set("limit", "1");
  url.searchParams.set("lang", "pt");

  const response = await fetch(url, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) return null;

  const data = (await response.json()) as {
    features?: Array<{
      geometry?: { coordinates?: [number, number] };
    }>;
  };

  const coords = data.features?.[0]?.geometry?.coordinates;
  if (!coords || coords.length < 2) return null;

  const [longitude, latitude] = coords;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  return { latitude, longitude };
}

/**
 * Resolve lat/lng a partir de um CEP (8 dígitos ou mascarado).
 */
export async function geocodeCep(rawCep: string): Promise<CepGeocodeResult> {
  const postalCode = normalizeCep(rawCep);
  if (!postalCode) {
    return { ok: false, reason: "invalid_cep" };
  }

  try {
    const fromNominatim = await geocodeNominatim(postalCode);
    if (fromNominatim) {
      return { ok: true, coords: fromNominatim, source: "nominatim" };
    }

    const fromPhoton = await geocodePhoton(postalCode);
    if (fromPhoton) {
      return { ok: true, coords: fromPhoton, source: "photon" };
    }

    return { ok: false, reason: "not_found" };
  } catch {
    return { ok: false, reason: "network" };
  }
}
