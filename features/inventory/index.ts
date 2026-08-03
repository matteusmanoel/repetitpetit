/**
 * Pure inventory planner exports only.
 * DB apply lives in `./apply-transition` (`server-only`) — import that file
 * directly from server modules (SN-06/SN-07).
 */
export {
  planTransition,
  type InventoryStatus,
  type InventoryTransition,
  type PlanTransitionOptions,
  type SoldChannel,
  type TransitionError,
  type TransitionPlan,
} from "@/features/inventory/transitions";
