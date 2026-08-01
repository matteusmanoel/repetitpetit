import type { Database } from "@/lib/supabase/types";

export type PaymentStatus = Database["public"]["Enums"]["payment_status"];

/**
 * Mapeia `payment.status` do Mercado Pago → `payment_status` interno (D46).
 *
 * Referência MP: approved | authorized | pending | in_process | in_mediation |
 * rejected | cancelled | refunded | charged_back.
 */
export function mapMercadoPagoPaymentStatus(
  mpStatus: string | null | undefined,
): PaymentStatus {
  switch ((mpStatus ?? "").toLowerCase().trim()) {
    case "approved":
      return "paid";
    case "authorized":
      return "authorized";
    case "pending":
    case "in_process":
    case "in_mediation":
      return "pending";
    case "rejected":
      return "failed";
    case "cancelled":
      return "cancelled";
    case "refunded":
    case "charged_back":
      return "refunded";
    default:
      return "pending";
  }
}

/** Pedido já saiu de `pending_payment` para um estado pós-pagamento. */
export function isOrderPastPendingPayment(
  orderStatus: Database["public"]["Enums"]["order_status"],
): boolean {
  return (
    orderStatus === "paid" ||
    orderStatus === "confirmed" ||
    orderStatus === "ready_for_pickup" ||
    orderStatus === "shipped" ||
    orderStatus === "completed"
  );
}
