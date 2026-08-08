import { slugifyProductName } from "@/features/admin/product-constants";
import {
  intakePreviewItemSchema,
  type IntakeDraftItem,
} from "@/features/admin/ai-intake/schemas";

export type MicHint = "none" | "lock" | "cancel";

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
