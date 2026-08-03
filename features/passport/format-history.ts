import { holdSessionBrowserLabel } from "@/features/passport/channel-label";
import type { PassportHistoryEvent } from "@/features/passport/types";

/** Store / online payment labels for Passport sale lines (pt-BR). */
export function paymentMethodLabel(method: string | null | undefined): string {
  switch (method) {
    case "cash":
      return "Dinheiro";
    case "card":
    case "card_local":
      return "Cartão";
    case "pix":
    case "pix_local":
      return "Pix";
    case "mercado_pago":
      return "Mercado Pago";
    case "online":
      return "Online";
    case "store":
      return "Loja física";
    default:
      return method && method.trim().length > 0 ? method : "—";
  }
}

export function formatHistoryTimestamp(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(iso));
}

function adminLabel(name: string | null | undefined): string {
  const trimmed = name?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : "admin";
}

function holdLabelFromNotes(notes: string | null): string {
  if (!notes) return "navegador";
  const match = notes.match(/Hold Session\s+(.+)/i);
  if (match?.[1]) {
    return holdSessionBrowserLabel(match[1].trim());
  }
  return holdSessionBrowserLabel(notes);
}

/**
 * Formats one timeline row for Passport Histórico (oldest→newest display).
 */
export function formatPassportHistoryLine(event: PassportHistoryEvent): string {
  const when = formatHistoryTimestamp(event.createdAt);
  const context = event.context ?? "";

  switch (context) {
    case "activation": {
      const who = adminLabel(event.actorName);
      const codeNote = event.notes?.includes("atribuído")
        ? event.notes
        : event.notes
          ? `${event.notes}`
          : null;
      return codeNote
        ? `${when} Peça ativada por ${who} — ${codeNote}`
        : `${when} Peça ativada por ${who}`;
    }
    case "hold":
      return `${when} Reservado online — Hold Session ${holdLabelFromNotes(event.notes)} (20 min)`;
    case "expiration":
      return `${when} Hold expirado — liberado automaticamente`;
    case "release":
      return `${when} Hold liberado — Hold Session ${holdLabelFromNotes(event.notes)}`;
    case "override": {
      const who = adminLabel(event.actorName);
      const reason = event.notes?.trim();
      return reason
        ? `${when} Override por ${who} — Motivo: "${reason}"`
        : `${when} Override por ${who}`;
    }
    case "sale": {
      const channel =
        event.saleChannel === "store" || event.notes === "store"
          ? "no balcão"
          : "online";
      const orderPart = event.orderPublicCode
        ? `Pedido ${event.orderPublicCode}`
        : "Pedido";
      const pay = paymentMethodLabel(
        event.paymentMethod ??
          (event.saleChannel === "online" ? "mercado_pago" : null),
      );
      return `${when} Vendido ${channel} — ${orderPart} (${pay})`;
    }
    default: {
      const from = event.fromStatus ?? "—";
      const to = event.toStatus;
      return `${when} Status ${from} → ${to}`;
    }
  }
}
