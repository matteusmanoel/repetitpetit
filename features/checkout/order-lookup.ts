import "server-only";

import { createServiceSupabaseClient } from "@/lib/supabase/server-service";

export type PublicOrderStub = {
  publicCode: string;
  status: string;
  paymentStatus: string;
  fulfillmentType: string;
  totalAmount: number;
  estimatedFulfillment: string | null;
  createdAt: string;
};

/**
 * Stub mínimo para `/pedido/[codigo]` (T15 redirect).
 * Leitura via service role — anon não tem SELECT em `orders` (D13).
 * T18 (página pública completa) é ticket separado.
 */
export async function getPublicOrderStub(
  publicCode: string,
): Promise<PublicOrderStub | null> {
  const code = publicCode.trim().toUpperCase();
  if (!/^RP-\d{4}-\d{4}$/.test(code)) {
    return null;
  }

  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase
    .from("orders")
    .select(
      "public_code, status, payment_status, fulfillment_type, total_amount, estimated_fulfillment, created_at",
    )
    .eq("public_code", code)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return {
    publicCode: data.public_code,
    status: data.status,
    paymentStatus: data.payment_status,
    fulfillmentType: data.fulfillment_type,
    totalAmount: Number(data.total_amount),
    estimatedFulfillment: data.estimated_fulfillment,
    createdAt: data.created_at,
  };
}
