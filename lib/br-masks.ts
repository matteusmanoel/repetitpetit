/**
 * Máscaras BR progressivas para inputs (moeda, CPF, dígitos).
 * Telefone: ver `lib/phone.ts` + `PhoneInput`.
 */

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

/** Converte reais (number) → centavos inteiros. */
export function reaisToCents(value: number): number {
  if (!Number.isFinite(value) || value < 0) return 0;
  return Math.round(value * 100);
}

/** Centavos → string decimal para FormData / Zod (`"55.00"`). */
export function centsToDecimalString(cents: number): string {
  if (!Number.isFinite(cents) || cents < 0) return "";
  return (cents / 100).toFixed(2);
}

/** Exibe centavos como `1.234,56` (sem R$). */
export function formatCentsBr(cents: number): string {
  if (!Number.isFinite(cents) || cents < 0) return "";
  return (cents / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Digitação de moeda: só dígitos → centavos (máx. 9 dígitos = R$ 9.999.999,99).
 * Retorna `null` se vazio.
 */
export function parseCurrencyDigitsToCents(raw: string): number | null {
  const digits = digitsOnly(raw).replace(/^0+(?=\d)/, "").slice(0, 9);
  if (!digits) return null;
  return Number.parseInt(digits, 10);
}

/** Máscara CPF progressiva: `000.000.000-00`. */
export function formatCpfBr(value: string): string {
  const digits = digitsOnly(value).slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) {
    return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  }
  if (digits.length <= 9) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  }
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

export function digitsOnlyCpf(value: string): string {
  return digitsOnly(value).slice(0, 11);
}
