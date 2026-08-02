/**
 * Gera o próximo `public_code` no formato RP-YYYY-NNNN.
 * Função pura — o caller persiste e trata conflito UNIQUE.
 */

export function formatPublicCode(year: number, sequence: number): string {
  const padded = String(sequence).padStart(4, "0");
  return `RP-${year}-${padded}`;
}

/**
 * Extrai o número sequencial de um código `RP-YYYY-NNNN`.
 * Retorna null se o formato não bater com o ano esperado.
 */
export function parsePublicCodeSequence(
  publicCode: string,
  year: number,
): number | null {
  const match = new RegExp(`^RP-${year}-(\\d{4})$`).exec(publicCode);
  if (!match) return null;
  const n = Number(match[1]);
  return Number.isFinite(n) ? n : null;
}

/**
 * Dado o maior código existente do ano (ou null), devolve o próximo.
 */
export function nextPublicCode(
  latestCode: string | null,
  year = new Date().getFullYear(),
): string {
  const current = latestCode
    ? (parsePublicCodeSequence(latestCode, year) ?? 0)
    : 0;
  return formatPublicCode(year, current + 1);
}
