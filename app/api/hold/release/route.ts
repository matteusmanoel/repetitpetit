import { NextResponse } from "next/server";

import {
  CART_SESSION_COOKIE,
  cartSessionCookieOptions,
  getCartSessionId,
} from "@/features/cart";
import { holdReleaseBodySchema } from "@/features/cart/schemas";
import {
  releaseHoldItem,
  releaseHoldSession,
} from "@/features/cart/hold-session";

/**
 * `POST /api/hold/release` — SN-02 release one Peça or the whole Hold Session.
 *
 * Body JSON:
 * - `{ "productId": "<uuid>" }` — release one item
 * - `{ "releaseSession": true, "finalStatus"?: "cancelled"|"expired" }` — full session
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = holdReleaseBodySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "invalid_body",
        message:
          "Envie { productId } ou { releaseSession: true, finalStatus? }.",
      },
      { status: 400 },
    );
  }

  const { sessionId, isNew } = await getCartSessionId();

  try {
    if ("releaseSession" in parsed.data) {
      const finalStatus = parsed.data.finalStatus ?? "cancelled";
      const result = await releaseHoldSession(sessionId, finalStatus);
      const response = NextResponse.json({
        released: result.status === "ok",
        status: result.status,
        finalStatus: result.status === "ok" ? result.finalStatus : undefined,
      });
      if (isNew) {
        response.cookies.set(
          CART_SESSION_COOKIE,
          sessionId,
          cartSessionCookieOptions(),
        );
      }
      return response;
    }

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
