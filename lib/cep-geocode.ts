/**
 * Geocode de CEP brasileiro → lat/lng.
 *
 * ViaCEP não devolve coordenadas (D118 / D128). Ordem:
 * 1. Nominatim (postalcode)
 * 2. Photon (CEP — lang=en; nunca pt)
 * 3. ViaCEP endereço → Nominatim/Photon estruturado (sem centro-município)
 *
 * Uso server-side (calculate frete / admin save). Respeita ~1 req/s Nominatim.
 */

import { fetchAddressByCep, normalizeCep, type ViaCepAddress } from "@/lib/viacep";
import type { LatLng } from "@/lib/geo/haversine";

export type CepGeocodeResult =
  | { ok: true; coords: LatLng; source: "nominatim" | "photon" }
  | { ok: false; reason: "invalid_cep" | "not_found" | "network" };

const NOMINATIM_USER_AGENT =
  "RepetiPetitCheckout/1.0 (contato@repetipetit.com.br)";

/** Photon só aceita default|de|en|fr — `pt` retorna HTTP 400 (D128). */
const PHOTON_LANG = "en";

const NOMINATIM_GAP_MS = 1_100;

let lastNominatimRequestAt = 0;

function formatCepMask(digits: string): string {
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

/**
 * Monta query de endereço a partir do ViaCEP.
 * Exige rua ou bairro — nunca só município (anti centro-município / Q3).
 */
export function buildStructuredAddressQuery(
  address: ViaCepAddress,
): string | null {
  const street = address.street.trim();
  const neighborhood = address.neighborhood.trim();
  const city = address.city.trim();
  const state = address.state.trim();

  if (!city || !state) return null;
  if (!street && !neighborhood) return null;

  const parts: string[] = [];
  if (street) {
    parts.push(street);
    if (neighborhood) parts.push(neighborhood);
  } else {
    parts.push(neighborhood);
  }
  parts.push(city, state, "Brasil");
  return parts.join(", ");
}

async function throttleNominatim(): Promise<void> {
  // Unit tests mock fetch; skip wall-clock gap to keep suite fast.
  if (process.env.VITEST) {
    lastNominatimRequestAt = Date.now();
    return;
  }

  const elapsed = Date.now() - lastNominatimRequestAt;
  if (lastNominatimRequestAt > 0 && elapsed < NOMINATIM_GAP_MS) {
    await new Promise((resolve) =>
      setTimeout(resolve, NOMINATIM_GAP_MS - elapsed),
    );
  }
  lastNominatimRequestAt = Date.now();
}

function parseNominatimCoords(
  data: Array<{ lat?: string; lon?: string }>,
): LatLng | null {
  const first = data[0];
  if (!first?.lat || !first?.lon) return null;

  const latitude = Number(first.lat);
  const longitude = Number(first.lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  return { latitude, longitude };
}

function parsePhotonCoords(data: {
  features?: Array<{
    geometry?: { coordinates?: [number, number] };
  }>;
}): LatLng | null {
  const coords = data.features?.[0]?.geometry?.coordinates;
  if (!coords || coords.length < 2) return null;

  const [longitude, latitude] = coords;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  return { latitude, longitude };
}

async function geocodeNominatimPostalCode(
  postalCode: string,
): Promise<LatLng | null> {
  await throttleNominatim();

  const masked = formatCepMask(postalCode);
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  url.searchParams.set("countrycodes", "br");
  url.searchParams.set("postalcode", masked);

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": NOMINATIM_USER_AGENT,
    },
  });

  if (!response.ok) return null;

  const data = (await response.json()) as Array<{
    lat?: string;
    lon?: string;
  }>;

  return parseNominatimCoords(data);
}

async function geocodeNominatimStructured(
  query: string,
): Promise<LatLng | null> {
  await throttleNominatim();

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  url.searchParams.set("countrycodes", "br");
  url.searchParams.set("q", query);

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": NOMINATIM_USER_AGENT,
    },
  });

  if (!response.ok) return null;

  const data = (await response.json()) as Array<{
    lat?: string;
    lon?: string;
  }>;

  return parseNominatimCoords(data);
}

async function geocodePhotonQuery(query: string): Promise<LatLng | null> {
  const url = new URL("https://photon.komoot.io/api/");
  url.searchParams.set("q", query);
  url.searchParams.set("limit", "1");
  url.searchParams.set("lang", PHOTON_LANG);

  const response = await fetch(url, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) return null;

  const data = (await response.json()) as {
    features?: Array<{
      geometry?: { coordinates?: [number, number] };
    }>;
  };

  return parsePhotonCoords(data);
}

async function geocodeViaStructuredAddress(
  postalCode: string,
): Promise<{ coords: LatLng; source: "nominatim" | "photon" } | null> {
  const viaCep = await fetchAddressByCep(postalCode);
  if (!viaCep.ok) return null;

  const query = buildStructuredAddressQuery(viaCep.address);
  if (!query) return null;

  const fromNominatim = await geocodeNominatimStructured(query);
  if (fromNominatim) {
    return { coords: fromNominatim, source: "nominatim" };
  }

  const fromPhoton = await geocodePhotonQuery(query);
  if (fromPhoton) {
    return { coords: fromPhoton, source: "photon" };
  }

  return null;
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
    const fromNominatim = await geocodeNominatimPostalCode(postalCode);
    if (fromNominatim) {
      return { ok: true, coords: fromNominatim, source: "nominatim" };
    }

    const masked = formatCepMask(postalCode);
    const fromPhoton = await geocodePhotonQuery(`${masked} Brasil`);
    if (fromPhoton) {
      return { ok: true, coords: fromPhoton, source: "photon" };
    }

    const structured = await geocodeViaStructuredAddress(postalCode);
    if (structured) {
      return {
        ok: true,
        coords: structured.coords,
        source: structured.source,
      };
    }

    return { ok: false, reason: "not_found" };
  } catch {
    return { ok: false, reason: "network" };
  }
}
