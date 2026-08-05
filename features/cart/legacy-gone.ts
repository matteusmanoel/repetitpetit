/**
 * Resposta canônica das rotas legadas `/api/cart/reserve` e `/api/cart/release`
 * após o cutover Hold Session (issue #96 / D90).
 */
export const LEGACY_CART_GONE_STATUS = 410 as const;

export const LEGACY_CART_GONE_BODY = {
  error: "gone",
  message:
    "A reserva via carrinho foi descontinuada. Use a Hold Session: POST /api/hold/reserve e POST /api/hold/release.",
} as const;
