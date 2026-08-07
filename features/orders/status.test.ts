import { describe, expect, it } from "vitest";

import {
  getFulfillmentLabel,
  getOrderStatusLabel,
  getProgressStepIndex,
  getProgressSteps,
  isTerminalFailureStatus,
} from "@/features/orders/status";

describe("getOrderStatusLabel", () => {
  it("rotula pending_payment, confirmed e na_sacolinha", () => {
    expect(getOrderStatusLabel("pending_payment")).toBe(
      "Aguardando pagamento",
    );
    expect(getOrderStatusLabel("confirmed")).toBe("Em separação");
    expect(getOrderStatusLabel("na_sacolinha")).toBe("Na sacolinha");
    expect(getOrderStatusLabel("shipped")).toBe("Enviado");
  });
});

describe("getProgressSteps", () => {
  it("usa Sacolinha / Entrega / Enviado conforme fulfillment", () => {
    expect(getProgressSteps("pickup").map((s) => s.label)).toEqual([
      "Pedido",
      "Pago",
      "Separando",
      "Sacolinha",
      "Concluído",
    ]);
    expect(getProgressSteps("delivery")[3]?.label).toBe("Entrega");
    expect(getProgressSteps("correios")[3]?.label).toBe("Enviado");
  });
});

describe("getProgressStepIndex", () => {
  it("mapeia confirmed, na_sacolinha e shipped nos passos corretos", () => {
    expect(getProgressStepIndex("pending_payment")).toBe(0);
    expect(getProgressStepIndex("paid")).toBe(1);
    expect(getProgressStepIndex("confirmed")).toBe(2);
    expect(getProgressStepIndex("ready_for_pickup")).toBe(3);
    expect(getProgressStepIndex("na_sacolinha")).toBe(3);
    expect(getProgressStepIndex("shipped")).toBe(3);
    expect(getProgressStepIndex("completed")).toBe(4);
    expect(getProgressStepIndex("cancelled")).toBe(-1);
    expect(getProgressStepIndex("expired")).toBe(-1);
  });
});

describe("isTerminalFailureStatus", () => {
  it("marca cancelado e expirado", () => {
    expect(isTerminalFailureStatus("cancelled")).toBe(true);
    expect(isTerminalFailureStatus("expired")).toBe(true);
    expect(isTerminalFailureStatus("paid")).toBe(false);
  });
});

describe("getFulfillmentLabel", () => {
  it("rótulos em português", () => {
    expect(getFulfillmentLabel("pickup")).toBe("Retirada na loja");
    expect(getFulfillmentLabel("delivery")).toBe("Entrega local");
    expect(getFulfillmentLabel("correios")).toBe("Envio pelos Correios");
    expect(getFulfillmentLabel("store_counter")).toBe("Venda no balcão");
  });
});
