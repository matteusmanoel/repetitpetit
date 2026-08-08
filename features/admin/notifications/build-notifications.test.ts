import { describe, expect, it } from "vitest";

import {
  buildAdminNotifications,
  formatNotifClock,
  isSacolinhaNearDeadline,
  SACOLINHA_NEAR_DEADLINE_DAYS,
} from "@/features/admin/notifications/build-notifications";
import type { FulfillmentQueueOrder } from "@/features/admin/fulfillment/types";

function fakeOrder(
  overrides: Partial<FulfillmentQueueOrder> & Pick<FulfillmentQueueOrder, "id">,
): FulfillmentQueueOrder {
  return {
    publicCode: "RP-2026-0001",
    status: "paid",
    fulfillmentType: "pickup",
    totalAmount: 49.9,
    itemCount: 2,
    paidAt: "2026-08-08T16:42:00.000Z",
    createdAt: "2026-08-08T16:40:00.000Z",
    trackingCode: null,
    pickupDeadline: null,
    customerName: "Ana Paula",
    customerPhone: "554599999999",
    items: [],
    ...overrides,
  };
}

const NOW = Date.parse("2026-08-08T17:00:00.000Z");

describe("isSacolinhaNearDeadline", () => {
  it("true when deadline within window or overdue", () => {
    const soon = new Date(NOW + 2 * 24 * 60 * 60 * 1000).toISOString();
    const overdue = new Date(NOW - 60_000).toISOString();
    const far = new Date(
      NOW + (SACOLINHA_NEAR_DEADLINE_DAYS + 5) * 24 * 60 * 60 * 1000,
    ).toISOString();

    expect(isSacolinhaNearDeadline(soon, NOW)).toBe(true);
    expect(isSacolinhaNearDeadline(overdue, NOW)).toBe(true);
    expect(isSacolinhaNearDeadline(far, NOW)).toBe(false);
    expect(isSacolinhaNearDeadline(null, NOW)).toBe(false);
  });
});

describe("buildAdminNotifications", () => {
  it("prioritizes urgent delivery over new paid sale for same order", () => {
    const orders = [
      fakeOrder({
        id: "d1",
        fulfillmentType: "delivery",
        status: "paid",
        customerName: "Ana Paula",
        itemCount: 2,
      }),
      fakeOrder({
        id: "p1",
        fulfillmentType: "pickup",
        status: "paid",
        customerName: "Carlos Mendes",
        itemCount: 3,
        paidAt: "2026-08-08T15:15:00.000Z",
      }),
      fakeOrder({
        id: "s1",
        status: "na_sacolinha",
        fulfillmentType: "pickup",
        customerName: "Juliana Costa",
        paidAt: "2026-07-01T12:00:00.000Z",
        pickupDeadline: new Date(NOW + 24 * 60 * 60 * 1000).toISOString(),
      }),
    ];

    const list = buildAdminNotifications(orders, { nowMs: NOW });

    expect(list.map((n) => n.priority)).toEqual([1, 2, 3]);
    expect(list[0]?.kind).toBe("urgent_delivery");
    expect(list[0]?.title).toBe("Entrega urgente");
    expect(list[1]?.kind).toBe("new_paid_sale");
    expect(list[1]?.body).toContain("Sacolinha");
    expect(list[2]?.kind).toBe("sacolinha_deadline");
    expect(list[2]?.body).toContain("Juliana Costa");
  });

  it("omits dismissed ids and sacolinha far from deadline", () => {
    const orders = [
      fakeOrder({ id: "p1", status: "paid", fulfillmentType: "pickup" }),
      fakeOrder({
        id: "s-far",
        status: "na_sacolinha",
        fulfillmentType: "pickup",
        pickupDeadline: new Date(
          NOW + 20 * 24 * 60 * 60 * 1000,
        ).toISOString(),
      }),
    ];

    const list = buildAdminNotifications(orders, {
      nowMs: NOW,
      dismissedIds: new Set(["paid:p1"]),
    });

    expect(list).toEqual([]);
  });

  it("sorts same priority by sortAt desc", () => {
    const orders = [
      fakeOrder({
        id: "older",
        paidAt: "2026-08-08T12:00:00.000Z",
      }),
      fakeOrder({
        id: "newer",
        paidAt: "2026-08-08T16:00:00.000Z",
      }),
    ];

    const list = buildAdminNotifications(orders, { nowMs: NOW });
    expect(list.map((n) => n.orderId)).toEqual(["newer", "older"]);
  });
});

describe("formatNotifClock", () => {
  it("returns HH:mm for same Sao Paulo day", () => {
    const clock = formatNotifClock("2026-08-08T16:42:00.000Z", NOW);
    expect(clock).toMatch(/^\d{2}:\d{2}$/);
  });
});
