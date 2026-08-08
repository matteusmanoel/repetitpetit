/**
 * Ops radar alert (CONTEXT Central de Notificações / D127).
 * Priority: 1 entrega urgente · 2 venda nova paga · 3 Sacolinha prazo.
 */
export type AdminNotificationPriority = 1 | 2 | 3;

export type AdminNotificationKind =
  | "urgent_delivery"
  | "new_paid_sale"
  | "sacolinha_deadline";

export type AdminNotification = {
  id: string;
  kind: AdminNotificationKind;
  priority: AdminNotificationPriority;
  orderId: string;
  publicCode: string;
  title: string;
  body: string;
  /** Relógio curto (ex.: 13:42) ou rótulo relativo. */
  at: string;
  /** Âncora ISO para ordenar empates na mesma prioridade. */
  sortAt: string;
  href: string;
};
