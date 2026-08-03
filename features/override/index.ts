/**
 * Override helpers (SN-06 / SN-13 coordination).
 *
 * SN-13 owns the Override UI/action and `override_events` insert.
 * SN-06 owns the paid-block gate + late webhook reconcile.
 *
 * SN-13 must call `assertOverrideAllowed` inside its transaction before
 * releasing a hold or cancelling a `pending_payment` order.
 */
export {
  assertOverrideAllowed,
  type OverrideGateResult,
} from "@/features/override/assert-override-allowed";
