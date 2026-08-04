import { NextResponse } from "next/server";

import {
  CART_SESSION_COOKIE,
  cartProductBodySchema,
  cartSessionCookieOptions,
  getCartSessionId,
  reserveProduct,
} from "@/features/cart";

/**
 * `POST /api/cart/reserve` — legacy cart reservation (cart_reservations).
 *
 * SN-02 adds `POST /api/hold/reserve` as the inventory-lock contract.
 * This route remains until SN-04 cutover (dual-read). Prefer Hold Session for
 * new work. After SN-04 ships, this route becomes 410 Gone.
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
    const result = await reserveProduct(parsed.data.productId, sessionId);

    if (!result.ok) {
      const response = NextResponse.json(
        {
          error: "unavailable",
          message: "Esta peça não está mais disponível.",
        },
        { status: 409 },
      );

      if (isNew) {
        response.cookies.set(CART_SESSION_COOKIE, sessionId, cartSessionCookieOptions());
      }

      return response;
    }

    const response = NextResponse.json({ reservation: result.reservation });

    if (isNew) {
      response.cookies.set(CART_SESSION_COOKIE, sessionId, cartSessionCookieOptions());
    }

    return response;
  } catch (error) {
    console.error("Erro inesperado em POST /api/cart/reserve:", error);
    return NextResponse.json(
      { error: "internal_error", message: "Erro inesperado ao reservar a peça." },
      { status: 500 },
    );
  }
}
