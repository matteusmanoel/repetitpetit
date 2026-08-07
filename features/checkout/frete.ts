/**
 * Cálculo de frete entrega imediata (D104).
 * frete = max(mínimo, distância_km × taxa_km × multiplicador)
 */

export type DeliveryFreteKnobs = {
  ratePerKm: number;
  multiplier: number;
  minAmount: number;
  maxRadiusKm: number;
};

export type FreteQuoteOk = {
  ok: true;
  distanceKm: number;
  amount: number;
  knobs: DeliveryFreteKnobs;
};

export type FreteQuoteOutOfRadius = {
  ok: false;
  reason: "out_of_radius";
  distanceKm: number;
  maxRadiusKm: number;
};

export type FreteQuoteResult = FreteQuoteOk | FreteQuoteOutOfRadius;

/** Arredonda dinheiro BRL em 2 casas (half-up). */
export function roundBrl(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Aplica fórmula D104. Não geocodifica — recebe km já calculado.
 */
export function quoteFrete(
  distanceKm: number,
  knobs: DeliveryFreteKnobs,
): FreteQuoteResult {
  if (distanceKm > knobs.maxRadiusKm) {
    return {
      ok: false,
      reason: "out_of_radius",
      distanceKm: roundBrl(distanceKm),
      maxRadiusKm: knobs.maxRadiusKm,
    };
  }

  const raw = distanceKm * knobs.ratePerKm * knobs.multiplier;
  const amount = roundBrl(Math.max(knobs.minAmount, raw));

  return {
    ok: true,
    distanceKm: roundBrl(distanceKm),
    amount,
    knobs,
  };
}

/** Snapshot persistido em `orders.pricing_snapshot_json.frete`. */
export type FreteSnapshot = {
  method: "haversine";
  customer_postal_code: string;
  store_postal_code: string;
  distance_km: number;
  rate_per_km: number;
  multiplier: number;
  min_amount: number;
  max_radius_km: number;
  amount: number;
};

export function buildFreteSnapshot(input: {
  customerPostalCode: string;
  storePostalCode: string;
  quote: FreteQuoteOk;
}): FreteSnapshot {
  return {
    method: "haversine",
    customer_postal_code: input.customerPostalCode,
    store_postal_code: input.storePostalCode,
    distance_km: input.quote.distanceKm,
    rate_per_km: input.quote.knobs.ratePerKm,
    multiplier: input.quote.knobs.multiplier,
    min_amount: input.quote.knobs.minAmount,
    max_radius_km: input.quote.knobs.maxRadiusKm,
    amount: input.quote.amount,
  };
}
