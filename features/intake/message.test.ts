import { describe, expect, it } from "vitest";

import {
  buildWhatsAppMessage,
  buildWhatsAppUrl,
} from "@/features/intake/message";

describe("buildWhatsAppMessage", () => {
  it("monta a mensagem no formato do docs/05-ux-direction.md", () => {
    const message = buildWhatsAppMessage({
      fullName: "Ana Silva",
      itemCount: 8,
      description: "Casacos e calças tamanho 4 anos, seminovos.",
      preferredMethod: "entrega_na_loja",
    });

    expect(message).toBe(
      "Olá! Me chamo Ana Silva, tenho 8 peças para desapegar. Casacos e calças tamanho 4 anos, seminovos.\n" +
        "Prefiro trazer na loja. Posso mandar mais fotos por aqui.",
    );
  });

  it("usa singular para 1 peça e trunca descrição longa", () => {
    const long = "Peça ".repeat(40).trim();
    const message = buildWhatsAppMessage({
      fullName: "João",
      itemCount: 1,
      description: long,
      preferredMethod: "envio_pelos_correios",
    });

    expect(message).toContain("tenho 1 peça para desapegar.");
    expect(message).toContain("Prefiro enviar pelos Correios.");
    expect(message.split("\n")[0]?.endsWith("…")).toBe(true);
  });
});

describe("buildWhatsAppUrl", () => {
  it("gera wa.me com texto codificado", () => {
    const url = buildWhatsAppUrl("554599999999", "Olá! teste");
    expect(url).toBe(
      `https://wa.me/554599999999?text=${encodeURIComponent("Olá! teste")}`,
    );
  });
});
