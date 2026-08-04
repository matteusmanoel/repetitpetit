import { NextResponse } from "next/server";

import {
  CART_SESSION_COOKIE,
  cartProductBodySchema,
  cartSessionCookieOptions,
  getCartSessionId,
} from "@/features/cart";
import { reserveHoldItem } from "@/features/cart/hold-session";

/**
 * `POST /api/hold/reserve` — SN-02 Hold Session reserve primitive (SN-04 UX).
 *
 * Body JSON: `{ "productId": "<uuid>" }`
 * Cookie: `rp_cart_session` kept as browser Hold Session id (D79).
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
    const result = await reserveHoldItem(sessionId, parsed.data.productId);

    if (result.status === "limit_reached") {
      const response = NextResponse.json(
        {
          error: "limit_reached",
          message: "Você já tem 5 peças reservadas nesta sessão.",
        },
        { status: 409 },
      );
      if (isNew) {
        response.cookies.set(
          CART_SESSION_COOKIE,
          sessionId,
          cartSessionCookieOptions(),
        );
      }
      return response;
    }

    if (result.status === "unavailable") {
      const response = NextResponse.json(
        {
          error: "unavailable",
          message: "Esta peça não está mais disponível.",
        },
        { status: 409 },
      );
      if (isNew) {
        response.cookies.set(
          CART_SESSION_COOKIE,
          sessionId,
          cartSessionCookieOptions(),
        );
      }
      return response;
    }

    const response = NextResponse.json({
      holdSessionId: result.holdSessionId,
      expiresAt: result.expiresAt,
      productId: parsed.data.productId,
    });

    if (isNew) {
      response.cookies.set(
        CART_SESSION_COOKIE,
        sessionId,
        cartSessionCookieOptions(),
      );
    }

    return response;
  } catch (error) {
    console.error("Erro inesperado em POST /api/hold/reserve:", error);
    return NextResponse.json(
      { error: "internal_error", message: "Erro inesperado ao reservar a peça." },
      { status: 500 },
    );
  }
}
