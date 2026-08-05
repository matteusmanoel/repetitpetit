import type { ReservationView } from "@/features/catalog/types";
import type { Database } from "@/lib/supabase/types";

export type ProductStatusForPdp = Database["public"]["Enums"]["product_status"];

/**
 * Estado de compra na PDP relativo à sessão do cookie (`rp_cart_session`).
 * Dona vê countdown + Finalizar + Liberar; outras veem Reservada sem TTL alheio.
 */
export type PdpPurchaseState =
  | { mode: "available" }
  | { mode: "own_hold"; expiresAt: string }
  | { mode: "reserved_by_other" }
  | { mode: "unavailable" };

export function resolvePdpPurchaseState(input: {
  productStatus: ProductStatusForPdp;
  reservation: ReservationView;
}): PdpPurchaseState {
  const { productStatus, reservation } = input;

  if (reservation.kind === "own") {
    return { mode: "own_hold", expiresAt: reservation.expiresAt };
  }

  if (
    productStatus === "hold" ||
    productStatus === "reserved" ||
    reservation.kind === "other"
  ) {
    return { mode: "reserved_by_other" };
  }

  if (productStatus === "available") {
    return { mode: "available" };
  }

  return { mode: "unavailable" };
}
