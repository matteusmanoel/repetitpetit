const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

/** Formata valor numérico como moeda brasileira (R$). */
export function formatPrice(value: number): string {
  return brl.format(value);
}
