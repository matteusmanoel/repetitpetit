import { NextResponse } from "next/server";

import {
  CART_SESSION_COOKIE,
  cartProductBodySchema,
  cartSessionCookieOptions,
  getCartSessionId,
  releaseProduct,
} from "@/features/cart";

/**
 * `POST /api/cart/release` — legacy cart release (cart_reservations).
 * Prefer `POST /api/hold/release` (SN-02). Remains until SN-04 cutover.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = cartProductBodySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_body", message: "Envie { productId } com um UUID válido." },
      { status: 400 },
    );
  }

  const { sessionId, isNew } = await getCartSessionId();

  try {
    const result = await releaseProduct(parsed.data.productId, sessionId);

    const response = NextResponse.json(result);

    if (isNew) {
      response.cookies.set(CART_SESSION_COOKIE, sessionId, cartSessionCookieOptions());
    }

    return response;
  } catch (error) {
    console.error("Erro inesperado em POST /api/cart/release:", error);
    return NextResponse.json(
      { error: "internal_error", message: "Erro inesperado ao liberar a reserva." },
      { status: 500 },
    );
  }
}
