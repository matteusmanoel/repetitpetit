import { describe, expect, it } from "vitest";

import {
  planTransition,
  type InventoryTransition,
} from "@/features/inventory/transitions";

const holdToSold: InventoryTransition = {
  from: "hold",
  to: "sold",
  context: {
    orderId: "order-1",
    channel: "online",
    holdSessionId: "hs-aaa",
  },
};

describe("planTransition — valid edges", () => {
  it("available → hold (SN-02 owned)", () => {
    const plan = planTransition("available", {
      from: "available",
      to: "hold",
      context: { holdSessionId: "cookie-session" },
    });
    expect(plan).toMatchObject({
      kind: "apply",
      runtimeOwner: "sn02",
      from: "available",
      to: "hold",
    });
  });

  it("hold → available released (SN-02 owned)", () => {
    const plan = planTransition("hold", {
      from: "hold",
      to: "available",
      context: { holdSessionId: "cookie-session", reason: "released" },
    });
    expect(plan).toMatchObject({
      kind: "apply",
      runtimeOwner: "sn02",
      to: "available",
    });
  });

  it("hold → sold online with matching holdSessionId", () => {
    const plan = planTransition("hold", holdToSold, {
      actualHoldSessionId: "hs-aaa",
    });
    expect(plan).toMatchObject({
      kind: "apply",
      runtimeOwner: "inventory",
      setSoldChannel: "online",
      cleanupHoldItems: true,
    });
  });

  it("available → sold store", () => {
    const plan = planTransition("available", {
      from: "available",
      to: "sold",
      context: { orderId: "order-2", channel: "store" },
    });
    expect(plan).toMatchObject({
      kind: "apply",
      runtimeOwner: "inventory",
      setSoldChannel: "store",
      cleanupHoldItems: false,
    });
  });

  it("available → sold online (slip-through)", () => {
    const plan = planTransition("available", {
      from: "available",
      to: "sold",
      context: { orderId: "order-3", channel: "online" },
    });
    expect(plan.kind).toBe("apply");
    if (plan.kind === "apply") {
      expect(plan.setSoldChannel).toBe("online");
    }
  });

  it("available → inactive", () => {
    const plan = planTransition("available", {
      from: "available",
      to: "inactive",
      context: { staffId: "staff-1" },
    });
    expect(plan).toMatchObject({
      kind: "apply",
      runtimeOwner: "inventory",
      to: "inactive",
    });
  });

  it("inactive → available", () => {
    const plan = planTransition("inactive", {
      from: "inactive",
      to: "available",
      context: { staffId: "staff-1" },
    });
    expect(plan).toMatchObject({
      kind: "apply",
      clearSoldChannel: true,
      to: "available",
    });
  });
});

describe("planTransition — invalid / terminal", () => {
  it("rejects sold → anything (terminal)", () => {
    const plan = planTransition("sold", {
      from: "available",
      to: "inactive",
      context: { staffId: "staff-1" },
    });
    expect(plan).toMatchObject({
      kind: "error",
      reason: "terminal_sold",
    });
    if (plan.kind === "error") {
      expect(plan.message).toContain("vendida");
    }
  });

  it("rejects sold → available even if transition.from is forged", () => {
    // current is sold — always terminal regardless of claimed from
    const plan = planTransition("sold", {
      from: "inactive",
      to: "available",
      context: { staffId: "staff-1" },
    });
    expect(plan.kind).toBe("error");
    if (plan.kind === "error") {
      expect(plan.reason).toBe("terminal_sold");
    }
  });

  it("rejects wrong from state", () => {
    const plan = planTransition("inactive", {
      from: "available",
      to: "sold",
      context: { orderId: "order-1", channel: "store" },
    });
    expect(plan).toMatchObject({
      kind: "error",
      reason: "wrong_from",
    });
  });

  it("rejects hold → sold without matching holdSessionId", () => {
    const plan = planTransition("hold", holdToSold, {
      actualHoldSessionId: "hs-other",
    });
    expect(plan).toMatchObject({
      kind: "error",
      reason: "hold_session_mismatch",
    });
  });

  it("rejects hold → sold with empty holdSessionId", () => {
    const plan = planTransition("hold", {
      from: "hold",
      to: "sold",
      context: {
        orderId: "order-1",
        channel: "online",
        holdSessionId: "",
      },
    });
    expect(plan).toMatchObject({
      kind: "error",
      reason: "missing_hold_session",
    });
  });

  it("rejects legacy reserved status", () => {
    const plan = planTransition("reserved", {
      from: "available",
      to: "inactive",
      context: { staffId: "staff-1" },
    });
    expect(plan).toMatchObject({
      kind: "error",
      reason: "invalid_transition",
    });
  });
});
