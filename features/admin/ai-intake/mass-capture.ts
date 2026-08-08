import { slugifyProductName } from "@/features/admin/product-constants";
import {
  intakePreviewItemSchema,
  type IntakeDraftItem,
} from "@/features/admin/ai-intake/schemas";

export type MicHint = "none" | "lock" | "cancel";

export type CameraErrorKind =
  | "insecure_context"
  | "permission_denied"
  | "not_found"
  | "unavailable";

/** Touch/pen → hold+lock; mouse → tap toggle (SP-3 / D121). */
export function isHoldLockPointer(pointerType: string): boolean {
  return pointerType === "touch" || pointerType === "pen";
}

export function shouldLockFromDelta(dy: number): boolean {
  return dy < -56;
}

export function resolveHoldLockHint(
  dx: number,
  dy: number,
  locked: boolean,
): MicHint {
  if (locked) return "lock";
  if (shouldLockFromDelta(dy)) return "lock";
  if (dx < -56) return "cancel";
  if (dy < -24) return "lock";
  return "none";
}

export function shouldCancelOnRelease(dx: number, hint: MicHint): boolean {
  return dx < -56 || hint === "cancel";
}

/**
 * Classify getUserMedia / MediaDevices failures for actionable PT copy.
 * Call with `window.isSecureContext` from the browser.
 */
export function classifyCameraError(
  error: unknown,
  isSecureContext: boolean,
  mediaDevicesAvailable = true,
): CameraErrorKind {
  if (!isSecureContext || !mediaDevicesAvailable) {
    return "insecure_context";
  }
  const name =
    error && typeof error === "object" && "name" in error
      ? String((error as { name: string }).name)
      : "";
  if (name === "NotAllowedError" || name === "PermissionDeniedError") {
    return "permission_denied";
  }
  if (name === "NotFoundError" || name === "DevicesNotFoundError") {
    return "not_found";
  }
  return "unavailable";
}

export function cameraErrorMessagePt(kind: CameraErrorKind): string {
  switch (kind) {
    case "insecure_context":
      return "A câmera só funciona em HTTPS (ou localhost). Abra o admin em HTTPS ou use o upload de foto.";
    case "permission_denied":
      return "Permissão de câmera negada. Libere o acesso nas configurações do navegador ou use o upload de foto.";
    case "not_found":
      return "Nenhuma câmera encontrada neste dispositivo. Use o upload de foto.";
    default:
      return "Câmera indisponível. Use o upload de foto.";
  }
}

/** Primary capture CTA — ends series and opens editable preview (D123). */
export function generatePreviewCtaLabel(options: {
  aiConfigured: boolean;
  capturedCount: number;
}): string {
  const { aiConfigured, capturedCount } = options;
  if (capturedCount <= 0) {
    return aiConfigured ? "Gerar preview IA" : "Abrir preview";
  }
  const countLabel =
    capturedCount === 1 ? "1 peça" : `${capturedCount} peças`;
  return aiConfigured
    ? `Gerar preview IA (${countLabel})`
    : `Abrir preview (${countLabel})`;
}

/**
 * Required fields for Finalizar — same contract as confirmIntakeBatchSchema.
 */
export function isIntakeDraftReady(draft: IntakeDraftItem): boolean {
  const price =
    typeof draft.price === "string"
      ? Number(draft.price.replace(",", "."))
      : draft.price;
  const compareAt =
    draft.compare_at_price === "" || draft.compare_at_price == null
      ? null
      : typeof draft.compare_at_price === "string"
        ? Number(draft.compare_at_price.replace(",", "."))
        : draft.compare_at_price;

  return intakePreviewItemSchema.safeParse({
    ...draft,
    name: draft.name.trim(),
    slug: draft.slug.trim() || slugifyProductName(draft.name),
    price,
    compare_at_price: compareAt,
    tags: draft.tags ?? [],
  }).success;
}

export function allIntakeDraftsReady(drafts: IntakeDraftItem[]): boolean {
  return drafts.length > 0 && drafts.every(isIntakeDraftReady);
}
