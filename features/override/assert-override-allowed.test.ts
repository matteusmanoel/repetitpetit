import { describe, expect, it } from "vitest";

import { assertOverrideAllowed } from "@/features/override/assert-override-allowed";

describe("assertOverrideAllowed (SN-06 / SN-13)", () => {
  it("blocks override of a paid order with already_paid", () => {
    expect(assertOverrideAllowed({ status: "paid" })).toEqual({
      ok: false,
      reason: "already_paid",
    });
  });

  it("blocks post-payment fulfillment statuses", () => {
    for (const status of [
      "confirmed",
      "ready_for_pickup",
      "na_sacolinha",
      "shipped",
      "completed",
    ] as const) {
      expect(assertOverrideAllowed({ status })).toEqual({
        ok: false,
        reason: "already_paid",
      });
    }
  });

  it("allows hold-only override (no order)", () => {
    expect(assertOverrideAllowed(null)).toEqual({ ok: true });
    expect(assertOverrideAllowed(undefined)).toEqual({ ok: true });
  });

  it("allows pending_payment (D62)", () => {
    expect(assertOverrideAllowed({ status: "pending_payment" })).toEqual({
      ok: true,
    });
  });

  it("allows already-cancelled / expired orders", () => {
    expect(assertOverrideAllowed({ status: "cancelled" })).toEqual({
      ok: true,
    });
    expect(assertOverrideAllowed({ status: "expired" })).toEqual({ ok: true });
  });
});
