/**
 * Payment id unknown to Mercado Pago (dashboard simulator uses `123456`,
 * deleted payments, wrong credential environment).
 */
export class MercadoPagoPaymentNotFoundError extends Error {
  readonly paymentId: string;

  constructor(paymentId: string) {
    super(`Pagamento Mercado Pago não encontrado: ${paymentId}`);
    this.name = "MercadoPagoPaymentNotFoundError";
    this.paymentId = paymentId;
  }
}

export function isMercadoPagoPaymentNotFoundError(
  error: unknown,
): error is MercadoPagoPaymentNotFoundError {
  return error instanceof MercadoPagoPaymentNotFoundError;
}
