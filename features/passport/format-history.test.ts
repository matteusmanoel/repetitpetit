import { describe, expect, it } from "vitest";

import {
  formatPassportHistoryLine,
  paymentMethodLabel,
} from "@/features/passport/format-history";
import type { PassportHistoryEvent } from "@/features/passport/types";

function event(
  partial: Partial<PassportHistoryEvent> &
    Pick<PassportHistoryEvent, "context" | "toStatus">,
): PassportHistoryEvent {
  return {
    id: "e1",
    createdAt: "2026-08-03T15:00:00.000Z",
    fromStatus: null,
    actorType: "system",
    actorId: null,
    actorName: null,
    notes: null,
    orderId: null,
    orderPublicCode: null,
    saleChannel: null,
    paymentMethod: null,
    ...partial,
  };
}

describe("paymentMethodLabel", () => {
  it("maps store and online methods", () => {
    expect(paymentMethodLabel("cash")).toBe("Dinheiro");
    expect(paymentMethodLabel("card")).toBe("Cartão");
    expect(paymentMethodLabel("pix")).toBe("Pix");
    expect(paymentMethodLabel("mercado_pago")).toBe("Mercado Pago");
  });
});

describe("formatPassportHistoryLine", () => {
  it("formats activation with RP code", () => {
    const line = formatPassportHistoryLine(
      event({
        context: "activation",
        fromStatus: null,
        toStatus: "available",
        actorType: "admin",
        actorName: "Ana",
        notes: "RP-000123 atribuído",
      }),
    );
    expect(line).toContain("Peça ativada por Ana");
    expect(line).toContain("RP-000123 atribuído");
  });

  it("formats hold reservation", () => {
    const line = formatPassportHistoryLine(
      event({
        context: "hold",
        fromStatus: "available",
        toStatus: "hold",
        notes: "Hold Session abcdefghijklmnop",
      }),
    );
    expect(line).toContain("Reservado online");
    expect(line).toContain("abcdefgh…");
    expect(line).toContain("20 min");
  });

  it("formats expiration", () => {
    const line = formatPassportHistoryLine(
      event({
        context: "expiration",
        fromStatus: "hold",
        toStatus: "available",
      }),
    );
    expect(line).toContain("Hold expirado");
    expect(line).toContain("liberado automaticamente");
  });

  it("formats override with reason", () => {
    const line = formatPassportHistoryLine(
      event({
        context: "override",
        fromStatus: "hold",
        toStatus: "available",
        actorType: "admin",
        actorName: "Bruno",
        notes: "Cliente no balcão",
      }),
    );
    expect(line).toContain('Override por Bruno — Motivo: "Cliente no balcão"');
  });

  it("formats store sale with payment method", () => {
    const line = formatPassportHistoryLine(
      event({
        context: "sale",
        fromStatus: "available",
        toStatus: "sold",
        actorType: "admin",
        notes: "store",
        saleChannel: "store",
        orderPublicCode: "RP-2026-0042",
        paymentMethod: "cash",
      }),
    );
    expect(line).toContain("Vendido no balcão");
    expect(line).toContain("Pedido RP-2026-0042");
    expect(line).toContain("Dinheiro");
  });
});
