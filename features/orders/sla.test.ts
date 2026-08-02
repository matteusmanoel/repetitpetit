import { describe, expect, it } from "vitest";

import { resolveSlaText } from "@/features/orders/sla";

describe("resolveSlaText", () => {
  it("prefere estimated_fulfillment gravado", () => {
    expect(resolveSlaText("Retire em até 4h úteis", "pickup")).toBe(
      "Retire em até 4h úteis",
    );
  });

  it("usa fallback D12/PRD quando vazio", () => {
    expect(resolveSlaText(null, "pickup")).toBe(
      "Pronta em até 4 horas úteis (mesmo dia se pedido até 16h)",
    );
    expect(resolveSlaText("  ", "delivery")).toBe(
      "Entrega em até 24 horas úteis",
    );
    expect(resolveSlaText(undefined, "correios")).toBe(
      "Postado em até 1 dia útil após confirmação do pagamento",
    );
  });
});
