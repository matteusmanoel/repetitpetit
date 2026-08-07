import "server-only";

import type { DeliveryFreteKnobs } from "@/features/checkout/frete";
import type { LatLng } from "@/lib/geo/haversine";
import { createServiceSupabaseClient } from "@/lib/supabase/server-service";

export type StoreDeliverySettings = {
  deliveryEnabled: boolean;
  storePostalCode: string | null;
  storeCoords: LatLng | null;
  knobs: DeliveryFreteKnobs;
  /** Pronto para cotar frete (CEP + coords + delivery on). */
  freteConfigured: boolean;
};

function num(value: number | string | null | undefined, fallback: number): number {
  if (value == null) return fallback;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Carrega knobs + origem da loja (service role — usado em actions).
 */
export async function loadStoreDeliverySettings(): Promise<StoreDeliverySettings> {
  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase
    .from("settings")
    .select(
      "delivery_enabled, store_postal_code, store_latitude, store_longitude, delivery_rate_per_km, delivery_multiplier, delivery_min_amount, delivery_max_radius_km",
    )
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Falha ao carregar settings de frete:", error);
    throw new Error("Não foi possível carregar configurações de frete.");
  }

  const knobs: DeliveryFreteKnobs = {
    ratePerKm: num(data?.delivery_rate_per_km, 2.5),
    multiplier: num(data?.delivery_multiplier, 1),
    minAmount: num(data?.delivery_min_amount, 8),
    maxRadiusKm: num(data?.delivery_max_radius_km, 15),
  };

  const storePostalCode =
    typeof data?.store_postal_code === "string" &&
    /^\d{8}$/.test(data.store_postal_code)
      ? data.store_postal_code
      : null;

  const lat = data?.store_latitude != null ? Number(data.store_latitude) : null;
  const lng =
    data?.store_longitude != null ? Number(data.store_longitude) : null;

  const storeCoords =
    lat != null &&
    lng != null &&
    Number.isFinite(lat) &&
    Number.isFinite(lng)
      ? { latitude: lat, longitude: lng }
      : null;

  const deliveryEnabled = data?.delivery_enabled ?? true;
  const freteConfigured = Boolean(
    deliveryEnabled && storePostalCode && storeCoords,
  );

  return {
    deliveryEnabled,
    storePostalCode,
    storeCoords,
    knobs,
    freteConfigured,
  };
}
