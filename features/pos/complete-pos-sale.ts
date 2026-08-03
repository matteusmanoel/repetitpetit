"use server";

import { requireAdminSession } from "@/features/admin/session";
import { confirmStoreSaleAction } from "@/features/pos/confirm-store-sale";
import { createStoreOrderAction } from "@/features/pos/create-store-order";
import type { StorePaymentMethodInput } from "@/features/pos/payment-method";
import { storePaymentMethodInputSchema } from "@/features/pos/schemas";
import { z } from "zod";

const completePosSaleSchema = z.object({
  productId: z.string().uuid("Peça inválida."),
  paymentMethod: storePaymentMethodInputSchema,
});

export type CompletePosSaleResult =
  | {
      ok: true;
      orderId: string;
      publicCode: string;
      outcome: "applied" | "already_paid";
    }
  | {
      ok: false;
      error: string;
      code: string;
      orderId?: string;
      publicCode?: string;
    };

/**
 * Combined POS sell: create store Order then confirm payment (SN-07 / D71 / D86).
 * Staff id comes from the authenticated admin session.
 */
export async function completePosSaleFromAdmin(input: {
  productId: string;
  paymentMethod: StorePaymentMethodInput;
}): Promise<CompletePosSaleResult> {
  const session = await requireAdminSession();

  const parsed = completePosSaleSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Dados inválidos.",
      code: "validation",
    };
  }

  const staffId = session.admin.id;

  const created = await createStoreOrderAction({
    productIds: [parsed.data.productId],
    staffId,
    paymentMethod: parsed.data.paymentMethod,
  });

  if (!created.ok) {
    return {
      ok: false,
      error: created.error,
      code: created.code,
    };
  }

  const confirmed = await confirmStoreSaleAction(created.orderId, staffId);

  if (!confirmed.ok) {
    return {
      ok: false,
      error: confirmed.error,
      code: confirmed.code,
      orderId: created.orderId,
      publicCode: created.publicCode,
    };
  }

  return {
    ok: true,
    orderId: confirmed.orderId,
    publicCode: confirmed.publicCode,
    outcome: confirmed.outcome,
  };
}
