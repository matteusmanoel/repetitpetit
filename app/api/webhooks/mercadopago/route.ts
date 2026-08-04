import { NextResponse } from "next/server";

import { applyMercadoPagoPaymentStatus } from "@/features/payments/apply-mp-status";
import { env } from "@/lib/env";
import { isMercadoPagoPaymentNotFoundError } from "@/lib/mercado-pago/errors";
import { fetchMercadoPagoPayment } from "@/lib/mercado-pago/fetch-payment";
import { validateMercadoPagoWebhookSignature } from "@/lib/mercado-pago/validate-webhook-signature";

type WebhookBody = {
  id?: number | string;
  type?: string;
  action?: string;
  data?: { id?: string | number };
  /** IPN legado às vezes envia `topic`. */
  topic?: string;
};

/**
 * `POST /api/webhooks/mercadopago`
 *
 * Valida `X-Signature` (fail-closed sem secret), busca o pagamento na API MP
 * e aplica status com service role (D13 / D46). Idempotente.
 */
export async function POST(request: Request) {
  const secret = env.MERCADOPAGO_WEBHOOK_SECRET;
  if (!secret) {
    console.error(
      "MERCADOPAGO_WEBHOOK_SECRET ausente — webhook recusado (fail-closed).",
    );
    return NextResponse.json(
      {
        error: "webhook_secret_missing",
        message: "Webhook não configurado neste ambiente.",
      },
      { status: 503 },
    );
  }

  const url = new URL(request.url);
  const queryDataId =
    url.searchParams.get("data.id") ?? url.searchParams.get("id");
  const queryType =
    url.searchParams.get("type") ?? url.searchParams.get("topic");

  const xSignature = request.headers.get("x-signature");
  const xRequestId = request.headers.get("x-request-id");

  let body: WebhookBody = {};
  try {
    const text = await request.text();
    if (text.trim()) {
      body = JSON.parse(text) as WebhookBody;
    }
  } catch {
    // Body vazio é aceitável (alguns retries / IPN só com query).
    body = {};
  }

  // Manifest usa `data.id` da query; fallback no body se a query vier vazia.
  const bodyDataId =
    body.data?.id !== undefined && body.data?.id !== null
      ? String(body.data.id)
      : null;
  const dataIdForSignature = queryDataId ?? bodyDataId;

  const signatureOk = validateMercadoPagoWebhookSignature({
    xSignature,
    xRequestId,
    dataId: dataIdForSignature,
    secret,
  });

  if (!signatureOk) {
    console.warn("Webhook Mercado Pago com assinatura inválida.");
    return NextResponse.json(
      { error: "invalid_signature", message: "Assinatura inválida." },
      { status: 401 },
    );
  }

  const topic = (body.type ?? body.topic ?? queryType ?? "").toLowerCase();
  const paymentId = extractPaymentId(body, queryDataId);

  // Ignora tópicos que não são payment — 200 evita retry infinito.
  if (topic && topic !== "payment") {
    return NextResponse.json({ ok: true, ignored: true, topic });
  }

  if (!paymentId) {
    console.warn("Webhook Mercado Pago sem payment id.", { topic, queryDataId });
    return NextResponse.json({ ok: true, ignored: true, reason: "no_payment_id" });
  }

  try {
    const payment = await fetchMercadoPagoPayment(paymentId);
    const result = await applyMercadoPagoPaymentStatus(payment);

    if (!result.ok) {
      if (result.code === "not_found") {
        // Pedido desconhecido — ack para não reenviar eternamente.
        console.warn("Webhook MP: pedido não encontrado", {
          paymentId,
          externalReference: payment.externalReference,
        });
        return NextResponse.json({
          ok: true,
          ignored: true,
          reason: "order_not_found",
        });
      }

      console.error("Webhook MP apply falhou:", result);
      return NextResponse.json(
        { error: result.code, message: result.error },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      outcome: result.outcome,
      publicCode: result.publicCode,
      paymentStatus: result.paymentStatus,
      orderStatus: result.orderStatus,
    });
  } catch (error) {
    // Dashboard "Simular notificação" uses data.id=123456 — payment does not exist.
    // Ack 200 so MP marks the URL healthy; real payments always have a real id.
    if (isMercadoPagoPaymentNotFoundError(error)) {
      console.warn("Webhook MP: pagamento inexistente na API", {
        paymentId: error.paymentId,
      });
      return NextResponse.json({
        ok: true,
        ignored: true,
        reason: "payment_not_found",
      });
    }

    const message =
      error instanceof Error ? error.message : "Erro desconhecido no webhook.";
    console.error("Webhook Mercado Pago:", message);
    return NextResponse.json(
      {
        error: "processing_failed",
        message: "Falha ao processar notificação de pagamento.",
      },
      { status: 500 },
    );
  }
}

function extractPaymentId(
  body: WebhookBody,
  queryDataId: string | null,
): string | null {
  const fromBody = body.data?.id;
  if (typeof fromBody === "string" && fromBody.trim()) return fromBody.trim();
  if (typeof fromBody === "number") return String(fromBody);

  if (queryDataId?.trim()) return queryDataId.trim();
  return null;
}
