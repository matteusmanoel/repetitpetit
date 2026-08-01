import { describe, expect, it } from "vitest";

import { buildPreferenceBody } from "@/lib/mercado-pago/preference-body";

describe("buildPreferenceBody", () => {
  it("monta items BRL + frete + back_urls HTTPS sem gift_message", () => {
    const body = buildPreferenceBody(
      {
        externalReference: "RP-2026-0042",
        items: [
          {
            id: "prod-1",
            title: "Vestido floral",
            quantity: 1,
            unitPrice: 49.9,
            pictureUrl: "https://cdn.example.com/a.jpg",
          },
        ],
        shippingAmount: 15,
        payer: {
          name: "Ana Silva",
          email: "ana@example.com",
          phone: "45999999999",
        },
        backPath: "/checkout/sucesso?codigo=RP-2026-0042",
        metadata: { order_id: "uuid-1", public_code: "RP-2026-0042" },
      },
      "https://repetipetit.com.br",
      "Repeti Petit",
    );

    expect(body.items).toHaveLength(2);
    expect(body.items[0]).toMatchObject({
      id: "prod-1",
      title: "Vestido floral",
      quantity: 1,
      unit_price: 49.9,
      currency_id: "BRL",
      picture_url: "https://cdn.example.com/a.jpg",
    });
    expect(body.items[1]).toMatchObject({
      id: "shipping",
      title: "Frete",
      unit_price: 15,
    });
    expect(body.external_reference).toBe("RP-2026-0042");
    expect(body.back_urls.success).toBe(
      "https://repetipetit.com.br/checkout/sucesso?codigo=RP-2026-0042",
    );
    expect(body.back_urls.pending).toBe(body.back_urls.success);
    expect(body.back_urls.failure).toBe(body.back_urls.success);
    expect(body.auto_return).toBe("approved");
    expect(body.notification_url).toBe(
      "https://repetipetit.com.br/api/webhooks/mercadopago",
    );
    expect(body.payer).toEqual({
      name: "Ana Silva",
      email: "ana@example.com",
      phone: { number: "45999999999" },
    });
    expect(body).not.toHaveProperty("gift_message");
    // Sem exclusões → PIX + cartão disponíveis no Checkout Pro.
    expect(body.payment_methods).toEqual({ installments: 12 });
    expect(JSON.stringify(body.payment_methods)).not.toContain("excluded");
  });

  it("omite picture_url http e frete zero", () => {
    const body = buildPreferenceBody(
      {
        externalReference: "RP-2026-0001",
        items: [
          {
            id: "p1",
            title: "Blusa",
            quantity: 1,
            unitPrice: 20,
            pictureUrl: "http://insecure.example.com/x.jpg",
          },
        ],
        shippingAmount: 0,
        backPath: "/checkout/sucesso?codigo=RP-2026-0001",
      },
      "https://example.com",
      "Loja",
    );

    expect(body.items).toHaveLength(1);
    expect(body.items[0].picture_url).toBeUndefined();
  });

  it("sanitiza external_reference removendo caracteres especiais", () => {
    const body = buildPreferenceBody(
      {
        externalReference: "RP-2026-0001@loja",
        items: [{ id: "1", title: "Item", quantity: 1, unitPrice: 10 }],
        backPath: "/checkout/sucesso",
      },
      "https://example.com",
      "Loja",
    );

    expect(body.external_reference).toBe("RP-2026-0001loja");
  });
});
