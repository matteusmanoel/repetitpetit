/**
 * Override helpers (SN-06 / SN-13 coordination).
 *
 * SN-13 owns `executeOverrideAction`, Override UI, and `override_events`.
 * SN-06 owns the paid-block gate + late webhook reconcile.
 *
 * `executeOverrideAction` MUST call `assertOverrideAllowed` before releasing
 * a hold or cancelling a `pending_payment` order.
 */
export {
  assertOverrideAllowed,
  type OverrideGateResult,
} from "@/features/override/assert-override-allowed";

export {
  executeOverrideAction,
  type ExecuteOverrideActionDeps,
  type ExecuteOverrideActionFailure,
  type ExecuteOverrideActionResult,
  type ExecuteOverrideActionSuccess,
} from "@/features/override/execute-override-action";

export { executeOverrideActionFromAdmin } from "@/features/override/override-action";

export {
  executeOverrideActionSchema,
  type ExecuteOverrideActionInput,
} from "@/features/override/schemas";

export {
  isOverrideActionVisible,
} from "@/features/override/visibility";
