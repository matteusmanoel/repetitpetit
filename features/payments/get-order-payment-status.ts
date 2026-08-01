import "server-only";

import { createServiceSupabaseClient } from "@/lib/supabase/server-service";

export type OrderPaymentStatus = {
  publicCode: string;
  orderStatus: string;
  paymentStatus: string;
  totalAmount: number;
  mpPreferenceId: string | null;
};

/**
 * Leitura privilegiada do status do pedido para a página `/checkout/sucesso`
 * (polling leve — confirmação real fica no webhook T17 / ticket #18).
 */
export async function getOrderPaymentStatus(
  publicCode: string,
): Promise<OrderPaymentStatus | null> {
  const code = publicCode.trim().toUpperCase();
  if (!/^RP-\d{4}-\d{4}$/.test(code)) {
    return null;
  }

  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase
    .from("orders")
    .select(
      "public_code, status, payment_status, total_amount, mp_preference_id",
    )
    .eq("public_code", code)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return {
    publicCode: data.public_code,
    orderStatus: data.status,
    paymentStatus: data.payment_status,
    totalAmount: Number(data.total_amount),
    mpPreferenceId: data.mp_preference_id,
  };
}
