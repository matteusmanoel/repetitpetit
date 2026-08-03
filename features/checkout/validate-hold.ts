import { isReservationExpired } from "@/features/cart/countdown";
import type { ConvertHoldSessionResult } from "@/features/cart/hold-session";

export type HoldSessionGateInput = {
  /** `hold_sessions.id` from the client (reserve response). */
  holdSessionId: string | undefined;
  /** Browser cookie `rp_cart_session` → `hold_sessions.session_id`. */
  browserSessionId: string | null;
  snapshot: {
    session: {
      id: string;
      session_id: string;
      status: string;
      expires_at: string;
    };
    items: { product_id: string }[];
  } | null;
  nowMs?: number;
};

export type HoldSessionGateResult =
  | {
      ok: true;
      holdSessionId: string;
      browserSessionId: string;
      productIds: string[];
      expiresAt: string;
    }
  | {
      ok: false;
      code: "reservation_expired" | "empty_cart" | "validation";
      error: string;
    };

/**
 * Pure gate for SN-04 checkout: active Hold Session, same browser cookie,
 * ≥1 hold_item. Does not touch the database.
 */
export function planHoldCheckoutGate(
  input: HoldSessionGateInput,
): HoldSessionGateResult {
  const holdSessionId = input.holdSessionId?.trim();
  if (!holdSessionId) {
    return {
      ok: false,
      code: "validation",
      error: "Sessão de reserva não informada. Reserve as peças novamente.",
    };
  }

  if (!input.browserSessionId) {
    return {
      ok: false,
      code: "reservation_expired",
      error:
        "Sua sessão de reserva expirou. Reserve as peças novamente para continuar.",
    };
  }

  if (!input.snapshot) {
    return {
      ok: false,
      code: "reservation_expired",
      error:
        "Sua sessão de reserva não está mais ativa. Reserve as peças novamente.",
    };
  }

  const { session, items } = input.snapshot;

  if (session.id !== holdSessionId) {
    return {
      ok: false,
      code: "reservation_expired",
      error:
        "A reserva não pertence a esta sessão do navegador. Reserve as peças novamente.",
    };
  }

  if (session.session_id !== input.browserSessionId) {
    return {
      ok: false,
      code: "reservation_expired",
      error:
        "A reserva não pertence a esta sessão do navegador. Reserve as peças novamente.",
    };
  }

  if (session.status !== "active") {
    return {
      ok: false,
      code: "reservation_expired",
      error:
        "Sua sessão de reserva não está mais ativa. Reserve as peças novamente.",
    };
  }

  if (isReservationExpired(session.expires_at, input.nowMs ?? Date.now())) {
    return {
      ok: false,
      code: "reservation_expired",
      error:
        "O tempo da sua reserva acabou. Reserve as peças novamente para continuar.",
    };
  }

  const productIds = [
    ...new Set(
      items
        .map((item) => item.product_id)
        .filter((id): id is string => typeof id === "string" && id.length > 0),
    ),
  ];

  if (productIds.length === 0) {
    return {
      ok: false,
      code: "empty_cart",
      error: "Sua reserva está vazia. Escolha pelo menos uma peça.",
    };
  }

  return {
    ok: true,
    holdSessionId: session.id,
    browserSessionId: input.browserSessionId,
    productIds,
    expiresAt: session.expires_at,
  };
}

/**
 * Interprets `convert_hold_session` for createOrderAction (not sold — D75).
 */
export function interpretConvertHoldResult(
  result: ConvertHoldSessionResult,
): { ok: true } | { ok: false; code: "reservation_expired"; error: string } {
  if (result.status === "ok") {
    return { ok: true };
  }

  if (result.status === "expired") {
    return {
      ok: false,
      code: "reservation_expired",
      error:
        "O tempo da sua reserva acabou antes de finalizar. Reserve novamente.",
    };
  }

  if (result.status === "empty") {
    return {
      ok: false,
      code: "reservation_expired",
      error: "Sua reserva ficou vazia. Escolha as peças novamente.",
    };
  }

  return {
    ok: false,
    code: "reservation_expired",
    error:
      "Não foi possível converter a reserva em pedido. Reserve as peças novamente.",
  };
}
