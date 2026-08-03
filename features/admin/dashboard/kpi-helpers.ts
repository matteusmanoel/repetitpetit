/** Holds com menos de 5 minutos até `expires_at` entram no widget "Expirando em breve". */
export const HOLD_EXPIRING_SOON_MS = 5 * 60 * 1000;

/**
 * Limites do dia civil em America/Sao_Paulo (BRT, UTC−3 sem DST desde 2019).
 * Intervalo semiaberto: `[startIso, nextDayStartIso)`.
 */
export function getSaoPauloDayBounds(now: Date = new Date()): {
  startIso: string;
  nextDayStartIso: string;
} {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const year = Number(parts.find((p) => p.type === "year")?.value);
  const month = Number(parts.find((p) => p.type === "month")?.value);
  const day = Number(parts.find((p) => p.type === "day")?.value);

  if (!year || !month || !day) {
    throw new Error("Falha ao calcular o dia civil em America/Sao_Paulo.");
  }

  // 00:00 BRT = 03:00 UTC
  const startMs = Date.UTC(year, month - 1, day, 3, 0, 0, 0);
  const nextMs = Date.UTC(year, month - 1, day + 1, 3, 0, 0, 0);

  return {
    startIso: new Date(startMs).toISOString(),
    nextDayStartIso: new Date(nextMs).toISOString(),
  };
}

/** Corte superior inclusivo para holds que expiram em breve. */
export function getHoldExpiringSoonCutoff(now: Date = new Date()): string {
  return new Date(now.getTime() + HOLD_EXPIRING_SOON_MS).toISOString();
}
