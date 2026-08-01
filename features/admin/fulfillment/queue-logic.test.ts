import { describe, expect, it } from "vitest";

import {
  formatQueueDocumentTitle,
  isPaidQueuePayload,
  removeQueueOrder,
  shouldRemoveFromPaidQueue,
  upsertQueueOrder,
} from "@/features/admin/fulfillment/queue-logic";
import type { FulfillmentQueueOrder } from "@/features/admin/fulfillment/types";

function fakeOrder(
  overrides: Partial<FulfillmentQueueOrder> & Pick<FulfillmentQueueOrder, "id">,
): FulfillmentQueueOrder {
  return {
    publicCode: "RP-2026-0001",
    status: "paid",
    fulfillmentType: "pickup",
    totalAmount: 49.9,
    itemCount: 1,
    paidAt: "2026-08-01T12:00:00.000Z",
    createdAt: "2026-08-01T11:50:00.000Z",
    customerName: "Ana",
    customerPhone: "554599999999",
    items: [],
    ...overrides,
  };
}

describe("isPaidQueuePayload", () => {
  it("accepts UPDATE/INSERT new row with status paid", () => {
    expect(isPaidQueuePayload({ id: "o1", status: "paid" })).toBe(true);
  });

  it("rejects pending_payment (real INSERT lifecycle)", () => {
    expect(
      isPaidQueuePayload({ id: "o1", status: "pending_payment" }),
    ).toBe(false);
  });

  it("rejects null / missing id", () => {
    expect(isPaidQueuePayload(null)).toBe(false);
    expect(isPaidQueuePayload({ status: "paid" })).toBe(false);
  });
});

describe("shouldRemoveFromPaidQueue", () => {
  it("removes when status leaves paid", () => {
    expect(
      shouldRemoveFromPaidQueue(
        { id: "o1", status: "paid" },
        { id: "o1", status: "confirmed" },
      ),
    ).toBe(true);
  });

  it("keeps when still paid", () => {
    expect(
      shouldRemoveFromPaidQueue(
        { id: "o1", status: "paid" },
        { id: "o1", status: "paid" },
      ),
    ).toBe(false);
  });
});

describe("upsertQueueOrder", () => {
  it("prepends newer paid_at and dedupes by id", () => {
    const older = fakeOrder({
      id: "a",
      paidAt: "2026-08-01T10:00:00.000Z",
    });
    const newer = fakeOrder({
      id: "b",
      paidAt: "2026-08-01T12:00:00.000Z",
    });
    const updated = fakeOrder({
      id: "a",
      paidAt: "2026-08-01T13:00:00.000Z",
      publicCode: "RP-2026-0099",
    });

    const merged = upsertQueueOrder([older, newer], updated);
    expect(merged.map((o) => o.id)).toEqual(["a", "b"]);
    expect(merged[0]?.publicCode).toBe("RP-2026-0099");
  });
});

describe("removeQueueOrder", () => {
  it("filters by id", () => {
    const list = [
      fakeOrder({ id: "a" }),
      fakeOrder({ id: "b", publicCode: "RP-2026-0002" }),
    ];
    expect(removeQueueOrder(list, "a").map((o) => o.id)).toEqual(["b"]);
  });
});

describe("formatQueueDocumentTitle", () => {
  it("prefixes count when > 0", () => {
    expect(formatQueueDocumentTitle(3)).toBe("(3) Pedidos · Repeti Petit");
  });

  it("omits badge when empty", () => {
    expect(formatQueueDocumentTitle(0)).toBe("Pedidos · Repeti Petit");
  });
});
