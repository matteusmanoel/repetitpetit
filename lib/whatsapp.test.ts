import { describe, expect, it } from "vitest";

import {
  buildOrderSupportMessage,
  getWhatsAppUrl,
} from "@/lib/whatsapp";

describe("getWhatsAppUrl", () => {
  it("gera wa.me com texto codificado", () => {
    expect(getWhatsAppUrl("554599999999", "Oi, preciso de ajuda!")).toBe(
      `https://wa.me/554599999999?text=${encodeURIComponent("Oi, preciso de ajuda!")}`,
    );
  });

  it("remove caracteres não numéricos do telefone", () => {
    expect(getWhatsAppUrl("+55 (45) 99999-9999", "teste")).toBe(
      `https://wa.me/5545999999999?text=${encodeURIComponent("teste")}`,
    );
  });
});

describe("buildOrderSupportMessage", () => {
  it("inclui o código do pedido", () => {
    expect(buildOrderSupportMessage("RP-2026-0042")).toBe(
      "Oi, preciso de ajuda com o pedido RP-2026-0042!",
    );
  });
});
