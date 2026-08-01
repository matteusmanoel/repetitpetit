import type { Database } from "@/lib/supabase/types";

export type CartReservation = Database["public"]["Tables"]["cart_reservations"]["Row"];

export type ReserveResult =
  | { ok: true; reservation: CartReservation }
  | { ok: false; reason: "unavailable" };
