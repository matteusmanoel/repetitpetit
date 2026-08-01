/**
 * Helpers de link WhatsApp (`wa.me`).
 * Padrão ADAPT do reuse-map — sem agente conversacional.
 */

export function getWhatsAppUrl(phoneDigits: string, message: string): string {
  const digits = phoneDigits.replace(/\D/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function buildOrderSupportMessage(publicCode: string): string {
  return `Oi, preciso de ajuda com o pedido ${publicCode}!`;
}
