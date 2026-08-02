import "server-only";

import type {
  CheckoutPageData,
  ShippingRuleOption,
} from "@/features/checkout/types";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/types";

function parseCities(metadata: Json | null): string[] {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return [];
  }
  const cities = (metadata as { cities?: unknown }).cities;
  if (!Array.isArray(cities)) return [];
  return cities.filter((c): c is string => typeof c === "string");
}

function parseState(metadata: Json | null): string | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }
  const state = (metadata as { state?: unknown }).state;
  return typeof state === "string" ? state.toUpperCase() : null;
}

function toRuleOption(row: {
  id: string;
  name: string;
  amount: number;
  description: string | null;
  metadata_json: Json | null;
}): ShippingRuleOption {
  return {
    id: row.id,
    name: row.name,
    amount: Number(row.amount),
    description: row.description,
    cities: parseCities(row.metadata_json),
    state: parseState(row.metadata_json),
  };
}

/**
 * Dados de checkout públicos: settings + shipping_rules ativos (anon + RLS).
 */
export async function getCheckoutPageData(): Promise<CheckoutPageData> {
  const supabase = await createServerSupabaseClient();

  const [settingsResult, rulesResult] = await Promise.all([
    supabase
      .from("settings")
      .select("pickup_address, pickup_enabled, delivery_enabled")
      .limit(1)
      .maybeSingle(),
    supabase
      .from("shipping_rules")
      .select("id, name, amount, description, metadata_json, sort_order")
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
  ]);

  const settings = settingsResult.data;
  const rules = (rulesResult.data ?? []).map(toRuleOption);

  const pickupRule =
    rules.find((r) => r.amount === 0 && r.cities.length === 0) ??
    rules.find((r) => r.name.toLowerCase().includes("retirada")) ??
    null;

  const deliveryRule =
    rules.find((r) => r.cities.length > 0 || r.amount > 0) ?? null;

  return {
    pickupEnabled: settings?.pickup_enabled ?? true,
    deliveryEnabled: settings?.delivery_enabled ?? true,
    pickupAddress: settings?.pickup_address ?? null,
    deliveryRule,
    pickupRule,
  };
}
