/**
 * TTL do pedido online em `pending_payment` (issue #99 / D92).
 * Alinhado com `orders.expires_at` DEFAULT (`now() + interval '10 minutes'`).
 * Após o prazo, `expire_due_pending_payment_orders` cancela o pedido e libera
 * a Peça via SN-02 — sem marcar sold.
 */
export const PENDING_PAYMENT_TTL_MINUTES = 10;
