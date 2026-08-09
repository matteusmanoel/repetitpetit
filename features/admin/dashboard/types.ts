/**
 * KPIs do painel admin — acervo, Hold Sessions (D66) e fila de fulfillment.
 */
export type AdminDashboardKpis = {
  productsAvailable: number;
  /** Soma `price` (R$) das peças `available` — valor de venda em estoque. */
  productsAvailableValue: number;
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
  /** Soma `total_amount` (R$) de pedidos pagos no dia civil BRT. */
  salesTodayAmount: number;
  /** Pedidos em status `na_sacolinha` (aguardando retirada). */
  ordersNaSacolinha: number;
};

/** Bucket diário de vendas por canal (valores em R$). */
export type DashboardDayChannelBucket = {
  dayKey: string;
  dayLabel: string;
  sacolinha: number;
  entrega: number;
  balcao: number;
};

export type DashboardAccessPoint = {
  dayKey: string;
  dayLabel: string;
  value: number;
};

export type DashboardTopCustomer = {
  customerId: string;
  name: string;
  orders: number;
  /** Soma de `total_amount` em R$. */
  totalAmount: number;
};

/**
 * Séries e listas do Painel ops (SP-6). Acessos são mock honestos —
 * sem instrumentação de analytics.
 */
export type AdminDashboardCharts = {
  series7d: DashboardDayChannelBucket[];
  series30d: DashboardDayChannelBucket[];
  accessMock7d: DashboardAccessPoint[];
  accessMock30d: DashboardAccessPoint[];
  topCustomers: DashboardTopCustomer[];
};
