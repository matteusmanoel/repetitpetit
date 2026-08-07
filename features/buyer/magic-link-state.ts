export type MagicLinkActionState = {
  ok: boolean;
  error: string | null;
  /** True after a successful send (or silent no-op for privacy). */
  sent: boolean;
};

export const initialMagicLinkActionState: MagicLinkActionState = {
  ok: false,
  error: null,
  sent: false,
};
