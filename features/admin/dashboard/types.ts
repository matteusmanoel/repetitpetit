/**
 * KPIs do painel admin — acervo, Hold Sessions (D66) e fila de fulfillment.
 */
export type AdminDashboardKpis = {
  productsAvailable: number;
  /**
   * Hold Sessions ativas (`hold_sessions.status = 'active'` e
   * `expires_at > now()`). Substitui a contagem em `cart_reservations` (D40/D66).
   */
  activeHolds: number;
  /** Holds ativas com `expires_at` em ≤ 5 minutos. */
  holdsExpiringSoon: number;
  productsSold: number;
  /** Pedidos `paid` — aguardando confirmação do lojista. */
  ordersPaid: number;
  /** Pedidos `confirmed` — em separação. */
  ordersConfirmed: number;
  ordersShipped: number;
  /** Pedidos `channel = store` criados no dia civil (America/Sao_Paulo). */
  storeOrdersToday: number;
  /** Linhas em `override_events` do dia civil (America/Sao_Paulo). */
  overridesToday: number;
};
