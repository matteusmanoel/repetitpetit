/**
 * Cookie anônimo do browser (= `hold_sessions.session_id`).
 * SN-04 / D79: keep name `rp_cart_session` (no rename to `rp_hold_session`).
 */
export const CART_SESSION_COOKIE = "rp_cart_session";

/**
 * TTL único da reserva de carrinho (D28).
 * Valor alinhado com `cart_reservations.expires_at` DEFAULT e PRD B3.
 */
export const RESERVATION_TTL_MINUTES = 20;
