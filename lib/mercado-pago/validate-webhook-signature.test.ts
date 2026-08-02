import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";

import { validateMercadoPagoWebhookSignature } from "@/lib/mercado-pago/validate-webhook-signature";

const SECRET = "test-webhook-secret";

function sign(manifest: string, secret = SECRET): string {
  return createHmac("sha256", secret).update(manifest).digest("hex");
}

describe("validateMercadoPagoWebhookSignature", () => {
  it("aceita assinatura válida com id + request-id + ts", () => {
    const dataId = "999999999";
    const requestId = "4ed4fa2b-0b31-42ec-a62f-ad793c486c59";
    const ts = "1704908010";
    const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
    const v1 = sign(manifest);

    expect(
      validateMercadoPagoWebhookSignature({
        xSignature: `ts=${ts},v1=${v1}`,
        xRequestId: requestId,
        dataId,
        secret: SECRET,
      }),
    ).toBe(true);
  });

  it("normaliza data.id para lowercase no manifest (ORD… → ord…)", () => {
    const dataId = "ORD01JQ4S4KY8HWQ6NA5PXB65B3D3";
    const requestId = "req-1";
    const ts = "1742505638683";
    const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${ts};`;
    const v1 = sign(manifest);

    expect(
      validateMercadoPagoWebhookSignature({
        xSignature: `ts=${ts},v1=${v1}`,
        xRequestId: requestId,
        dataId,
        secret: SECRET,
      }),
    ).toBe(true);
  });

  it("omite pares ausentes do manifest", () => {
    const ts = "1704908010";
    const manifest = `ts:${ts};`;
    const v1 = sign(manifest);

    expect(
      validateMercadoPagoWebhookSignature({
        xSignature: `ts=${ts},v1=${v1}`,
        xRequestId: null,
        dataId: null,
        secret: SECRET,
      }),
    ).toBe(true);
  });

  it("rejeita v1 adulterado", () => {
    expect(
      validateMercadoPagoWebhookSignature({
        xSignature: "ts=1704908010,v1=deadbeef",
        xRequestId: "req-1",
        dataId: "123",
        secret: SECRET,
      }),
    ).toBe(false);
  });

  it("rejeita secret vazio ou header ausente", () => {
    expect(
      validateMercadoPagoWebhookSignature({
        xSignature: "ts=1,v1=abc",
        xRequestId: "r",
        dataId: "1",
        secret: "",
      }),
    ).toBe(false);

    expect(
      validateMercadoPagoWebhookSignature({
        xSignature: null,
        xRequestId: "r",
        dataId: "1",
        secret: SECRET,
      }),
    ).toBe(false);
  });
});
