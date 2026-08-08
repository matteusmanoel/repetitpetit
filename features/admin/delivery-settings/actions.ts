"use server";

import { revalidatePath } from "next/cache";

import type { DeliverySettingsActionState } from "@/features/admin/delivery-settings/action-state";
import { parseDeliverySettingsFormData } from "@/features/admin/delivery-settings/schemas";
import { requireAdminSession } from "@/features/admin/session";
import { geocodeCep } from "@/lib/cep-geocode";
import { createServiceSupabaseClient } from "@/lib/supabase/server-service";

function firstFieldError(
  error: {
    flatten: () => { fieldErrors: Record<string, string[] | undefined> };
  },
): DeliverySettingsActionState["fieldErrors"] {
  const flat = error.flatten().fieldErrors;
  const fieldErrors: DeliverySettingsActionState["fieldErrors"] = {};

  for (const [key, messages] of Object.entries(flat)) {
    if (messages?.[0]) {
      fieldErrors[
        key as keyof NonNullable<DeliverySettingsActionState["fieldErrors"]>
      ] = messages[0];
    }
  }

  return fieldErrors;
}

/**
 * Atualiza knobs de frete + CEP loja (geocode → lat/lng cache).
 */
export async function updateDeliverySettingsAction(
  _prev: DeliverySettingsActionState,
  formData: FormData,
): Promise<DeliverySettingsActionState> {
  await requireAdminSession();

  const parsed = parseDeliverySettingsFormData(formData);
  if (!parsed.success) {
    return {
      error: "Revise os campos destacados.",
      fieldErrors: firstFieldError(parsed.error),
    };
  }

  const geo = await geocodeCep(parsed.data.storePostalCode);
  if (!geo.ok) {
    const messages = {
      invalid_cep: "Informe um CEP válido com 8 dígitos.",
      not_found: "Não encontramos a localização deste CEP.",
      network: "Não foi possível geocodificar o CEP. Tente de novo.",
    } as const;
    return {
      error: messages[geo.reason],
      fieldErrors: { storePostalCode: messages[geo.reason] },
    };
  }

  const supabase = createServiceSupabaseClient();
  const { data: row, error: loadError } = await supabase
    .from("settings")
    .select("id")
    .limit(1)
    .maybeSingle();

  if (loadError || !row) {
    console.error("Settings ausente para frete:", loadError);
    return { error: "Configurações da loja não encontradas." };
  }

  const { error } = await supabase
    .from("settings")
    .update({
      delivery_enabled: parsed.data.deliveryEnabled,
      store_postal_code: parsed.data.storePostalCode,
      store_latitude: geo.coords.latitude,
      store_longitude: geo.coords.longitude,
      delivery_rate_per_km: parsed.data.ratePerKm,
      delivery_multiplier: parsed.data.multiplier,
      delivery_min_amount: parsed.data.minAmount,
      delivery_max_radius_km: parsed.data.maxRadiusKm,
      updated_at: new Date().toISOString(),
    })
    .eq("id", row.id);

  if (error) {
    console.error("Falha ao salvar frete:", error);
    return { error: `Não foi possível salvar: ${error.message}` };
  }

  revalidatePath("/admin/configuracoes");
  revalidatePath("/checkout");

  return {
    success: "Frete atualizado. Coordenadas da loja recalculadas pelo CEP.",
  };
}
