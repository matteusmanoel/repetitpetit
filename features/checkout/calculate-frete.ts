"use server";

import { z } from "zod";

import { buildFreteSnapshot, quoteFrete } from "@/features/checkout/frete";
import { loadStoreDeliverySettings } from "@/features/checkout/load-delivery-settings";
import { geocodeCep } from "@/lib/cep-geocode";
import { haversineKm } from "@/lib/geo/haversine";
import { normalizeCep } from "@/lib/viacep";

const calculateFreteSchema = z.object({
  postalCode: z
    .string({ error: "Informe o CEP." })
    .trim()
    .transform((value) => value.replace(/\D/g, ""))
    .refine((digits) => /^\d{8}$/.test(digits), "CEP deve ter 8 dígitos."),
});

export type CalculateFreteSuccess = {
  ok: true;
  postalCode: string;
  distanceKm: number;
  amount: number;
  maxRadiusKm: number;
};

export type CalculateFreteFailure = {
  ok: false;
  code:
    | "validation"
    | "not_configured"
    | "invalid_cep"
    | "geocode_failed"
    | "out_of_radius"
    | "network";
  error: string;
  distanceKm?: number;
  maxRadiusKm?: number;
};

export type CalculateFreteResult = CalculateFreteSuccess | CalculateFreteFailure;

/**
 * Cota frete haversine (CEP cliente ↔ CEP loja). Público no checkout.
 */
export async function calculateFreteAction(
  raw: unknown,
): Promise<CalculateFreteResult> {
  const parsed = calculateFreteSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      code: "validation",
      error: parsed.error.issues[0]?.message ?? "CEP inválido.",
    };
  }

  let settings;
  try {
    settings = await loadStoreDeliverySettings();
  } catch {
    return {
      ok: false,
      code: "not_configured",
      error: "Frete indisponível no momento. Tente de novo ou escolha Sacolinha.",
    };
  }

  if (!settings.freteConfigured || !settings.storeCoords || !settings.storePostalCode) {
    return {
      ok: false,
      code: "not_configured",
      error:
        "Entrega imediata ainda não está configurada. Escolha Sacolinha para pagar.",
    };
  }

  const customerGeo = await geocodeCep(parsed.data.postalCode);
  if (!customerGeo.ok) {
    const messages = {
      invalid_cep: "Informe um CEP válido com 8 dígitos.",
      not_found: "Não encontramos a localização deste CEP.",
      network: "Não foi possível localizar o CEP. Tente de novo.",
    } as const;
    return {
      ok: false,
      code: customerGeo.reason === "network" ? "network" : "geocode_failed",
      error: messages[customerGeo.reason],
    };
  }

  const distanceKm = haversineKm(settings.storeCoords, customerGeo.coords);
  const quote = quoteFrete(distanceKm, settings.knobs);

  if (!quote.ok) {
    return {
      ok: false,
      code: "out_of_radius",
      error: `Fora da área de entrega (máx. ${quote.maxRadiusKm} km). Escolha Sacolinha.`,
      distanceKm: quote.distanceKm,
      maxRadiusKm: quote.maxRadiusKm,
    };
  }

  return {
    ok: true,
    postalCode: parsed.data.postalCode,
    distanceKm: quote.distanceKm,
    amount: quote.amount,
    maxRadiusKm: settings.knobs.maxRadiusKm,
  };
}

/**
 * Recalcula frete no server ao criar pedido (nunca confiar no client).
 */
export async function resolveDeliveryFreteForOrder(customerPostalCode: string): Promise<
  | {
      ok: true;
      amount: number;
      snapshot: ReturnType<typeof buildFreteSnapshot>;
      estimatedFulfillment: string;
    }
  | { ok: false; error: string; code: "shipping" }
> {
  const postalCode = normalizeCep(customerPostalCode);
  if (!postalCode) {
    return { ok: false, error: "Informe um CEP válido.", code: "shipping" };
  }

  let settings;
  try {
    settings = await loadStoreDeliverySettings();
  } catch {
    return {
      ok: false,
      error: "Não foi possível calcular o frete. Tente novamente.",
      code: "shipping",
    };
  }

  if (!settings.freteConfigured || !settings.storeCoords || !settings.storePostalCode) {
    return {
      ok: false,
      error: "Entrega imediata não está disponível no momento.",
      code: "shipping",
    };
  }

  const customerGeo = await geocodeCep(postalCode);
  if (!customerGeo.ok) {
    return {
      ok: false,
      error: "Não foi possível localizar o CEP de entrega.",
      code: "shipping",
    };
  }

  const distanceKm = haversineKm(settings.storeCoords, customerGeo.coords);
  const quote = quoteFrete(distanceKm, settings.knobs);
  if (!quote.ok) {
    return {
      ok: false,
      error: `Entrega disponível apenas em até ${quote.maxRadiusKm} km da loja. Escolha Sacolinha.`,
      code: "shipping",
    };
  }

  return {
    ok: true,
    amount: quote.amount,
    snapshot: buildFreteSnapshot({
      customerPostalCode: postalCode,
      storePostalCode: settings.storePostalCode,
      quote,
    }),
    estimatedFulfillment: "Entrega em até 24h úteis",
  };
}
