import { NextResponse } from "next/server";

import { getOrderPaymentStatus } from "@/features/payments/get-order-payment-status";

/**
 * `GET /api/payments/status?codigo=RP-YYYY-NNNN`
 *
 * Polling leve para `/checkout/sucesso` enquanto o webhook (#18) não confirma.
 * Não sincroniza com a API do MP — só lê `orders` via service role (D13).
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const codigo = searchParams.get("codigo");

  if (!codigo) {
    return NextResponse.json(
      { error: "missing_codigo", message: "Informe o código do pedido." },
      { status: 400 },
    );
  }

  const status = await getOrderPaymentStatus(codigo);

  if (!status) {
    return NextResponse.json(
      { error: "not_found", message: "Pedido não encontrado." },
      { status: 404 },
    );
  }

  return NextResponse.json({
    publicCode: status.publicCode,
    orderStatus: status.orderStatus,
    paymentStatus: status.paymentStatus,
    totalAmount: status.totalAmount,
    confirmed:
      status.paymentStatus === "paid" || status.orderStatus === "paid",
  });
}
