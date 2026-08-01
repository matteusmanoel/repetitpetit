import { NextResponse } from "next/server";

import { syncOrderPayment } from "@/features/payments/sync-order-payment";

/**
 * `POST /api/payments/sync`
 *
 * Body JSON: `{ "publicCode": "RP-YYYY-NNNN" }` ou `{ "orderId": "<uuid>" }`.
 * Reconcilia o pedido com o estado atual do pagamento no Mercado Pago (D46).
 */
export async function POST(request: Request) {
  let body: { publicCode?: string; orderId?: string; codigo?: string };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json(
      {
        error: "invalid_body",
        message: "Envie um JSON com publicCode ou orderId.",
      },
      { status: 400 },
    );
  }

  const publicCode = body.publicCode ?? body.codigo;
  const result = await syncOrderPayment({
    publicCode,
    orderId: body.orderId,
  });

  if (!result.ok) {
    const status =
      result.code === "not_found" || result.code === "no_payment"
        ? 404
        : result.code === "invalid"
          ? 400
          : result.code === "mp_config"
            ? 503
            : result.code === "db"
              ? 500
              : 502;

    return NextResponse.json(
      { error: result.code, message: result.error },
      { status },
    );
  }

  return NextResponse.json({
    ok: true,
    outcome: result.outcome,
    publicCode: result.publicCode,
    orderId: result.orderId,
    paymentStatus: result.paymentStatus,
    orderStatus: result.orderStatus,
    syncedFrom: result.syncedFrom,
    confirmed: result.paymentStatus === "paid" || result.orderStatus === "paid",
  });
}
