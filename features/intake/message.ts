import {
  PREFERRED_METHOD_WHATSAPP,
  SHORT_DESCRIPTION_MAX_CHARS,
  type PreferredMethod,
} from "@/features/intake/constants";

export type WhatsAppMessageInput = {
  fullName: string;
  itemCount: number;
  description: string;
  preferredMethod: PreferredMethod;
};

/**
 * Gera a mensagem WhatsApp do desapego exatamente no formato de
 * docs/05-ux-direction.md:
 *
 * > Olá! Me chamo [nome], tenho [qtd] peças para desapegar. [descrição curta]
 * > Prefiro [método]. Posso mandar mais fotos por aqui.
 */
export function buildWhatsAppMessage(input: WhatsAppMessageInput): string {
  const shortDescription = truncateDescription(input.description);
  const method = PREFERRED_METHOD_WHATSAPP[input.preferredMethod];
  const quantityLabel =
    input.itemCount === 1 ? "1 peça" : `${input.itemCount} peças`;

  return (
    `Olá! Me chamo ${input.fullName}, tenho ${quantityLabel} para desapegar. ${shortDescription}\n` +
    `Prefiro ${method}. Posso mandar mais fotos por aqui.`
  );
}

export function buildWhatsAppUrl(phoneDigits: string, message: string): string {
  return `https://wa.me/${phoneDigits}?text=${encodeURIComponent(message)}`;
}

function truncateDescription(description: string): string {
  const normalized = description.replace(/\s+/g, " ").trim();

  if (normalized.length <= SHORT_DESCRIPTION_MAX_CHARS) {
    return normalized;
  }

  return `${normalized.slice(0, SHORT_DESCRIPTION_MAX_CHARS - 1).trimEnd()}…`;
}
