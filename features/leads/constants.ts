/** Origem fixa do popup da home — sem cupom (docs/09-decisions.md D10). */
export const LEAD_SOURCE_POPUP_FIRST_SCROLL = "popup_first_scroll" as const;

/** Flag localStorage: popup já foi exibido/fechado neste device. */
export const LEAD_POPUP_SEEN_KEY = "rp_lead_popup_seen";

/** Fração do scroll da página para disparar o popup (~30%). */
export const LEAD_POPUP_SCROLL_THRESHOLD = 0.3;
