import type { Database } from "@/lib/supabase/types";

/** Slice N inventory statuses (D67). `reserved` is legacy and not transitionable here. */
export type InventoryStatus = Extract<
  Database["public"]["Enums"]["product_status"],
  "available" | "hold" | "sold" | "inactive"
>;

export type SoldChannel = "online" | "store";

/**
 * Canonical inventory transitions (SN-05).
 *
 * available↔hold are modeled for validation/docs; runtime must go through
 * SN-02 RPCs (`reserve_hold_item` / `release_*`) — see apply-transition.ts.
 *
 * `available → sold` allows `online` for paid slip-through (no hold projection)
 * as well as store POS (D71).
 */
export type InventoryTransition =
  | {
      from: "available";
      to: "hold";
      context: { holdSessionId: string };
    }
  | {
      from: "hold";
      to: "available";
      context: {
        holdSessionId: string;
        reason: "released" | "expired" | "override";
      };
    }
  | {
      from: "hold";
      to: "sold";
      context: {
        orderId: string;
        channel: SoldChannel;
        /** Hold Session UUID (`hold_sessions.id`) that currently owns the Peça. */
        holdSessionId: string;
      };
    }
  | {
      from: "available";
      to: "sold";
      context: { orderId: string; channel: SoldChannel };
    }
  | {
      from: "available";
      to: "inactive";
      context: { staffId: string };
    }
  | {
      from: "inactive";
      to: "available";
      context: { staffId: string };
    };

export type TransitionRuntimeOwner = "sn02" | "inventory";

export type TransitionPlan = {
  kind: "apply";
  from: InventoryTransition["from"];
  to: InventoryTransition["to"];
  /** Who executes the mutation at runtime. */
  runtimeOwner: TransitionRuntimeOwner;
  setSoldChannel: SoldChannel | null;
  clearSoldChannel: boolean;
  cleanupHoldItems: boolean;
  transition: InventoryTransition;
};

export type TransitionErrorReason =
  | "terminal_sold"
  | "wrong_from"
  | "hold_session_mismatch"
  | "invalid_transition"
  | "missing_hold_session";

export type TransitionError = {
  kind: "error";
  reason: TransitionErrorReason;
  message: string;
};

export type PlanTransitionOptions = {
  /**
   * When validating hold-aware transitions, the Hold Session UUID currently
   * attached to the product (`hold_items.hold_session_id`).
   */
  actualHoldSessionId?: string | null;
};

function isInventoryStatus(value: string): value is InventoryStatus {
  return (
    value === "available" ||
    value === "hold" ||
    value === "sold" ||
    value === "inactive"
  );
}

/**
 * Pure inventory transition planner — no I/O.
 * Returns a plan (ops needed) or an error (invalid / terminal sold / mismatch).
 */
export function planTransition(
  current: Database["public"]["Enums"]["product_status"] | string,
  transition: InventoryTransition,
  opts?: PlanTransitionOptions,
): TransitionPlan | TransitionError {
  if (current === "sold") {
    return {
      kind: "error",
      reason: "terminal_sold",
      message: "Peça já vendida — status terminal; nenhuma transição é permitida.",
    };
  }

  if (!isInventoryStatus(current)) {
    return {
      kind: "error",
      reason: "invalid_transition",
      message: `Status de inventário não suportado: ${current}.`,
    };
  }

  if (current !== transition.from) {
    return {
      kind: "error",
      reason: "wrong_from",
      message: `Transição inválida: esperado status "${transition.from}", atual é "${current}".`,
    };
  }

  if ("holdSessionId" in transition.context) {
    const expected = transition.context.holdSessionId;

    if (!expected || expected.trim().length === 0) {
      return {
        kind: "error",
        reason: "missing_hold_session",
        message: "Hold Session é obrigatória para esta transição.",
      };
    }

    if (opts && opts.actualHoldSessionId !== undefined) {
      if (opts.actualHoldSessionId !== expected) {
        return {
          kind: "error",
          reason: "hold_session_mismatch",
          message:
            "Hold Session informada não corresponde à reserva ativa da peça.",
        };
      }
    }
  }

  if (transition.from === "available" && transition.to === "hold") {
    return {
      kind: "apply",
      from: "available",
      to: "hold",
      runtimeOwner: "sn02",
      setSoldChannel: null,
      clearSoldChannel: false,
      cleanupHoldItems: false,
      transition,
    };
  }

  if (transition.from === "hold" && transition.to === "available") {
    return {
      kind: "apply",
      from: "hold",
      to: "available",
      runtimeOwner: "sn02",
      setSoldChannel: null,
      clearSoldChannel: false,
      cleanupHoldItems: false,
      transition,
    };
  }

  if (transition.from === "hold" && transition.to === "sold") {
    return {
      kind: "apply",
      from: "hold",
      to: "sold",
      runtimeOwner: "inventory",
      setSoldChannel: transition.context.channel,
      clearSoldChannel: false,
      cleanupHoldItems: true,
      transition,
    };
  }

  if (transition.from === "available" && transition.to === "sold") {
    return {
      kind: "apply",
      from: "available",
      to: "sold",
      runtimeOwner: "inventory",
      setSoldChannel: transition.context.channel,
      clearSoldChannel: false,
      cleanupHoldItems: false,
      transition,
    };
  }

  if (transition.from === "available" && transition.to === "inactive") {
    return {
      kind: "apply",
      from: "available",
      to: "inactive",
      runtimeOwner: "inventory",
      setSoldChannel: null,
      clearSoldChannel: false,
      cleanupHoldItems: false,
      transition,
    };
  }

  if (transition.from === "inactive" && transition.to === "available") {
    return {
      kind: "apply",
      from: "inactive",
      to: "available",
      runtimeOwner: "inventory",
      setSoldChannel: null,
      clearSoldChannel: true,
      cleanupHoldItems: false,
      transition,
    };
  }

  return {
    kind: "error",
    reason: "invalid_transition",
    message: "Transição de inventário não reconhecida.",
  };
}
