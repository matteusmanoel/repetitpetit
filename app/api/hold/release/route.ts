import { NextResponse } from "next/server";

import {
  CART_SESSION_COOKIE,
  cartProductBodySchema,
  cartSessionCookieOptions,
  getCartSessionId,
} from "@/features/cart";
import { releaseHoldItem } from "@/features/cart/hold-session";

/**
 * `POST /api/hold/release` — SN-02 release one Peça from the active Hold Session.
 *
 * Body JSON: `{ "productId": "<uuid>" }`
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
    const result = await releaseHoldItem(sessionId, parsed.data.productId);

    const response = NextResponse.json({
      released: result.status === "ok",
      status: result.status,
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
    console.error("Erro inesperado em POST /api/hold/release:", error);
    return NextResponse.json(
      { error: "internal_error", message: "Erro inesperado ao liberar a peça." },
      { status: 500 },
    );
  }
}
