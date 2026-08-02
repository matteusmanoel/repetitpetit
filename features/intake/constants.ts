/**
 * Preferências de entrega do desapego — valores persistidos em
 * `intake_requests.preferred_method` (docs/04-data-model.md).
 */
export const PREFERRED_METHODS = {
  entrega_na_loja: "entrega_na_loja",
  envio_pelos_correios: "envio_pelos_correios",
} as const;

export type PreferredMethod =
  (typeof PREFERRED_METHODS)[keyof typeof PREFERRED_METHODS];

/** Rótulos da UI (step 3) — docs/05-ux-direction.md. */
export const PREFERRED_METHOD_LABELS: Record<PreferredMethod, string> = {
  entrega_na_loja: "Trago na loja",
  envio_pelos_correios: "Envio pelos Correios",
};

/**
 * Frases que cabem em "Prefiro [método]" na mensagem WhatsApp
 * (docs/05-ux-direction.md).
 */
export const PREFERRED_METHOD_WHATSAPP: Record<PreferredMethod, string> = {
  entrega_na_loja: "trazer na loja",
  envio_pelos_correios: "enviar pelos Correios",
};

export const MAX_INTAKE_PHOTOS = 5;
export const SHORT_DESCRIPTION_MAX_CHARS = 120;
