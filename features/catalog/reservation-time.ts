/**
 * Minutos restantes até `expiresAt` (ceil). Retorna 0 se já expirou.
 */
export function minutesRemaining(expiresAt: string, nowMs: number = Date.now()): number {
  const expiresMs = new Date(expiresAt).getTime();

  if (Number.isNaN(expiresMs)) {
    return 0;
  }

  return Math.max(0, Math.ceil((expiresMs - nowMs) / 60_000));
}
