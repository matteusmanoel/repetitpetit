/**
 * KPIs do painel admin (T21) — peças do acervo + fila de fulfillment.
 */
export type AdminDashboardKpis = {
  productsAvailable: number;
  /** Reservas ativas em `cart_reservations` (`expires_at > now()`). */
  productsReserved: number;
  productsSold: number;
  /** Pedidos `paid` — aguardando confirmação do lojista. */
  ordersPaid: number;
  /** Pedidos `confirmed` — em separação. */
  ordersConfirmed: number;
  ordersShipped: number;
};
