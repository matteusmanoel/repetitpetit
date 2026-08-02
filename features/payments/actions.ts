"use server";

import {
  createCheckoutPreferenceByPublicCode,
  type CreateCheckoutPreferenceResult,
} from "@/features/payments/create-checkout-preference";

/**
 * Server action: "Pagar com Mercado Pago" a partir de pedido pending.
 */
export async function startMercadoPagoPaymentAction(
  publicCode: string,
): Promise<CreateCheckoutPreferenceResult> {
  return createCheckoutPreferenceByPublicCode(publicCode);
}
