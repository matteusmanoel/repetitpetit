/** Canal da Sale para UI staff (pt-BR). */
export function saleChannelLabel(channel: string): string {
  switch (channel) {
    case "online":
      return "Online";
    case "store":
      return "Loja física";
    default:
      return channel;
  }
}

/** Short label for Hold Session browser cookie (D66). */
export function holdSessionBrowserLabel(sessionId: string): string {
  const trimmed = sessionId.trim();
  if (!trimmed) return "navegador desconhecido";
  if (trimmed.length <= 12) return trimmed;
  return `${trimmed.slice(0, 8)}…`;
}
