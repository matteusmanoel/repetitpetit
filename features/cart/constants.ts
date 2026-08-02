/** Cookie anônimo que identifica a sessão de carrinho (docs/04-data-model.md). */
export const CART_SESSION_COOKIE = "rp_cart_session";

/**
 * TTL único da reserva de carrinho (D28).
 * Valor alinhado com `cart_reservations.expires_at` DEFAULT e PRD B3.
 */
export const RESERVATION_TTL_MINUTES = 20;
