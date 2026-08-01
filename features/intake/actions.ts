"use server";

import { intakeRequestSchema } from "@/features/intake/schemas";
import {
  buildWhatsAppMessage,
  buildWhatsAppUrl,
} from "@/features/intake/message";
import { env } from "@/lib/env";
import { createServiceSupabaseClient } from "@/lib/supabase/server-service";

export type SubmitIntakeResult =
  | {
      success: true;
      id: string;
      whatsappUrl: string;
      message: string;
    }
  | {
      success: false;
      error: string;
    };

/**
 * Persiste o pedido de desapego (`intake_requests` + `intake_photos`) e
 * devolve a mensagem/`wa.me` pré-preenchidos. Usa service role porque o
 * upload público já passou pela rota escopada e queremos uma escrita
 * atômica confiável no server (docs/09-decisions.md D28 / D09).
 */
export async function submitIntakeAction(
  raw: unknown,
): Promise<SubmitIntakeResult> {
  const parsed = intakeRequestSchema.safeParse(raw);

  if (!parsed.success) {
    const first = parsed.error.issues[0]?.message ?? "Dados inválidos.";
    return { success: false, error: first };
  }

  const whatsappNumber = env.NEXT_PUBLIC_STORE_WHATSAPP;

  if (!whatsappNumber) {
    return {
      success: false,
      error:
        "WhatsApp da loja ainda não está configurado. Tente de novo em breve.",
    };
  }

  const data = parsed.data;
  const supabase = createServiceSupabaseClient();

  const { data: requestRow, error: requestError } = await supabase
    .from("intake_requests")
    .insert({
      full_name: data.fullName,
      phone: data.phone,
      email: data.email ?? null,
      item_count: data.itemCount,
      description: data.description,
      preferred_method: data.preferredMethod,
      status: "new",
    })
    .select("id")
    .single();

  if (requestError || !requestRow) {
    console.error("Falha ao criar intake_requests:", requestError);
    return {
      success: false,
      error: "Não foi possível enviar seu desapego. Tente novamente.",
    };
  }

  if (data.photoUrls.length > 0) {
    const { error: photosError } = await supabase.from("intake_photos").insert(
      data.photoUrls.map((imageUrl, index) => ({
        intake_request_id: requestRow.id,
        image_url: imageUrl,
        sort_order: index,
      })),
    );

    if (photosError) {
      console.error("Falha ao criar intake_photos:", photosError);
      // Pedido já existe — remove para não deixar lead sem as fotos
      // que o usuário acha que enviou.
      await supabase.from("intake_requests").delete().eq("id", requestRow.id);
      return {
        success: false,
        error: "Não foi possível salvar as fotos. Tente novamente.",
      };
    }
  }

  const message = buildWhatsAppMessage({
    fullName: data.fullName,
    itemCount: data.itemCount,
    description: data.description,
    preferredMethod: data.preferredMethod,
  });

  return {
    success: true,
    id: requestRow.id,
    message,
    whatsappUrl: buildWhatsAppUrl(whatsappNumber, message),
  };
}
