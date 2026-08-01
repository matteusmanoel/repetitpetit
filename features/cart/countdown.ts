/**
 * Formata o tempo restante até `expiresAt` como MM:SS (docs/05-ux-direction.md).
 * Retorna `00:00` se já expirou ou se a data for inválida.
 */
export function formatCountdown(
  expiresAt: string,
  nowMs: number = Date.now(),
): string {
  const expiresMs = new Date(expiresAt).getTime();

  if (Number.isNaN(expiresMs)) {
    return "00:00";
  }

  const totalSeconds = Math.max(0, Math.floor((expiresMs - nowMs) / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

/** `true` se `expiresAt` já passou (ou é inválido). */
export function isReservationExpired(
  expiresAt: string,
  nowMs: number = Date.now(),
): boolean {
  const expiresMs = new Date(expiresAt).getTime();

  if (Number.isNaN(expiresMs)) {
    return true;
  }

  return expiresMs <= nowMs;
}
