import { describe, expect, it } from "vitest";

import {
  getFulfillmentLabel,
  getOrderStatusLabel,
  getProgressStepIndex,
  getProgressSteps,
  isTerminalFailureStatus,
} from "@/features/orders/status";

describe("getOrderStatusLabel", () => {
  it("rotula pending_payment e confirmed", () => {
    expect(getOrderStatusLabel("pending_payment")).toBe(
      "Aguardando pagamento",
    );
    expect(getOrderStatusLabel("confirmed")).toBe("Em separação");
    expect(getOrderStatusLabel("shipped")).toBe("Enviado");
  });
});

describe("getProgressSteps", () => {
  it("usa Pronto para retirada e Enviado para delivery/correios", () => {
    expect(getProgressSteps("pickup").map((s) => s.label)).toEqual([
      "Pedido",
      "Pago",
      "Separando",
      "Pronto",
      "Concluído",
    ]);
    expect(getProgressSteps("delivery")[3]?.label).toBe("Enviado");
    expect(getProgressSteps("correios")[3]?.label).toBe("Enviado");
  });
});

describe("getProgressStepIndex", () => {
  it("mapeia confirmed e shipped nos passos corretos", () => {
    expect(getProgressStepIndex("pending_payment")).toBe(0);
    expect(getProgressStepIndex("paid")).toBe(1);
    expect(getProgressStepIndex("confirmed")).toBe(2);
    expect(getProgressStepIndex("ready_for_pickup")).toBe(3);
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
  });
});
