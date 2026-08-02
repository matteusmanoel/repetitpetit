import { describe, expect, it } from "vitest";

import type { OrderStatus } from "@/features/orders/types";

import {
  isInProgressStatus,
  planFulfillmentTransition,
  type FulfillmentTargetStatus,
} from "@/features/admin/fulfillment/transitions";

const ALL_STATUSES: OrderStatus[] = [
  "pending_payment",
  "paid",
  "confirmed",
  "ready_for_pickup",
  "shipped",
  "completed",
  "cancelled",
  "expired",
];

describe("planFulfillmentTransition", () => {
  it("paid → confirmed (apply)", () => {
    const plan = planFulfillmentTransition("paid", "confirmed");
    expect(plan).toEqual({
      kind: "apply",
      from: "paid",
      to: "confirmed",
      requiresTracking: false,
      setConfirmedAt: true,
      setCancelledAt: false,
      setCompletedAt: false,
      setTrackingCode: false,
    });
  });

  it("confirmed → ready_for_pickup (apply)", () => {
    const plan = planFulfillmentTransition("confirmed", "ready_for_pickup");
    expect(plan.kind).toBe("apply");
    if (plan.kind === "apply") {
      expect(plan.to).toBe("ready_for_pickup");
      expect(plan.requiresTracking).toBe(false);
    }
  });

  it("confirmed → shipped requires tracking", () => {
    const plan = planFulfillmentTransition("confirmed", "shipped");
    expect(plan).toMatchObject({
      kind: "apply",
      requiresTracking: true,
      setTrackingCode: true,
    });
  });

  it("ready_for_pickup → completed (apply)", () => {
    expect(planFulfillmentTransition("ready_for_pickup", "completed").kind).toBe(
      "apply",
    );
  });

  it("shipped → completed (apply)", () => {
    const plan = planFulfillmentTransition("shipped", "completed");
    expect(plan.kind).toBe("apply");
    if (plan.kind === "apply") {
      expect(plan.setCompletedAt).toBe(true);
    }
  });

  it("paid → cancelled sets cancelled_at", () => {
    const plan = planFulfillmentTransition("paid", "cancelled");
    expect(plan).toMatchObject({
      kind: "apply",
      setCancelledAt: true,
    });
  });

  it("confirmed → cancelled (apply)", () => {
    expect(planFulfillmentTransition("confirmed", "cancelled").kind).toBe(
      "apply",
    );
  });

  it.each<[FulfillmentTargetStatus]>([
    ["confirmed"],
    ["ready_for_pickup"],
    ["shipped"],
    ["completed"],
    ["cancelled"],
  ])("idempotent when already at %s", (target) => {
    const plan = planFulfillmentTransition(target, target);
    expect(plan).toEqual({ kind: "idempotent", status: target });
  });

  it("denies illegal transitions", () => {
    expect(planFulfillmentTransition("pending_payment", "confirmed").kind).toBe(
      "denied",
    );
    expect(planFulfillmentTransition("paid", "shipped").kind).toBe("denied");
    expect(planFulfillmentTransition("confirmed", "completed").kind).toBe(
      "denied",
    );
    expect(planFulfillmentTransition("shipped", "cancelled").kind).toBe(
      "denied",
    );
    expect(planFulfillmentTransition("completed", "cancelled").kind).toBe(
      "denied",
    );
    expect(planFulfillmentTransition("ready_for_pickup", "shipped").kind).toBe(
      "denied",
    );
  });

  it("only allows each target from documented sources", () => {
    const expected: Record<FulfillmentTargetStatus, OrderStatus[]> = {
      confirmed: ["paid"],
      ready_for_pickup: ["confirmed"],
      shipped: ["confirmed"],
      completed: ["ready_for_pickup", "shipped"],
      cancelled: ["paid", "confirmed"],
    };

    for (const [target, fromList] of Object.entries(expected) as [
      FulfillmentTargetStatus,
      OrderStatus[],
    ][]) {
      for (const status of ALL_STATUSES) {
        const plan = planFulfillmentTransition(status, target);
        if (status === target) {
          expect(plan.kind).toBe("idempotent");
        } else if (fromList.includes(status)) {
          expect(plan.kind).toBe("apply");
        } else {
          expect(plan.kind).toBe("denied");
        }
      }
    }
  });
});

describe("isInProgressStatus", () => {
  it("includes confirmed / ready / shipped", () => {
    expect(isInProgressStatus("confirmed")).toBe(true);
    expect(isInProgressStatus("ready_for_pickup")).toBe(true);
    expect(isInProgressStatus("shipped")).toBe(true);
  });

  it("excludes paid and terminals", () => {
    expect(isInProgressStatus("paid")).toBe(false);
    expect(isInProgressStatus("completed")).toBe(false);
    expect(isInProgressStatus("cancelled")).toBe(false);
  });
});
