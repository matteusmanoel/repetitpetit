import "server-only";

import { createServiceSupabaseClient } from "@/lib/supabase/server-service";

export type AdminDeliverySettings = {
  id: string;
  storeName: string;
  deliveryEnabled: boolean;
  storePostalCode: string | null;
  storeLatitude: number | null;
  storeLongitude: number | null;
  ratePerKm: number;
  multiplier: number;
  minAmount: number;
  maxRadiusKm: number;
};

function num(value: number | string | null | undefined, fallback: number): number {
  if (value == null) return fallback;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export async function getAdminDeliverySettings(): Promise<AdminDeliverySettings | null> {
  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase
    .from("settings")
    .select(
      "id, store_name, delivery_enabled, store_postal_code, store_latitude, store_longitude, delivery_rate_per_km, delivery_multiplier, delivery_min_amount, delivery_max_radius_km",
    )
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Falha ao carregar settings de frete (admin):", error);
    return null;
  }

  if (!data) return null;

  return {
    id: data.id,
    storeName: data.store_name,
    deliveryEnabled: data.delivery_enabled,
    storePostalCode: data.store_postal_code,
    storeLatitude:
      data.store_latitude != null ? Number(data.store_latitude) : null,
    storeLongitude:
      data.store_longitude != null ? Number(data.store_longitude) : null,
    ratePerKm: num(data.delivery_rate_per_km, 2.5),
    multiplier: num(data.delivery_multiplier, 1),
    minAmount: num(data.delivery_min_amount, 8),
    maxRadiusKm: num(data.delivery_max_radius_km, 15),
  };
}
