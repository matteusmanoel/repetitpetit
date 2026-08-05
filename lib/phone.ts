/**
 * Formatação de telefone BR para input e display.
 * Persistência / Zod continuam só com dígitos (ver checkout schemas).
 */

/** Remove tudo que não for dígito. */
export function digitsOnlyPhone(value: string): string {
  return value.replace(/\D/g, "");
}

/**
 * Máscara progressiva:
 * - até 10 dígitos → (XX) XXXX-XXXX (fixo)
 * - 11 dígitos → (XX) XXXXX-XXXX (celular)
 * Aceita no máximo 11 dígitos.
 */
export function formatPhoneBr(value: string): string {
  const digits = digitsOnlyPhone(value).slice(0, 11);
  if (digits.length === 0) return "";
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  }
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

/**
 * Display legível; se incompleto, ainda aplica a máscara progressiva.
 * String vazia → string vazia.
 */
export function formatPhoneBrDisplay(value: string): string {
  return formatPhoneBr(value);
}
