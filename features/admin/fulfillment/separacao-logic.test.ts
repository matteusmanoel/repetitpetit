import { describe, expect, it } from "vitest";

import {
  applyLocalPackedAt,
  filterSeparacaoOrders,
  getSeparacaoStatusLabel,
  orderAllPacked,
  packedCount,
} from "@/features/admin/fulfillment/separacao-logic";
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
    trackingCode: null,
    pickupDeadline: null,
    customerName: "Ana Silva",
    customerPhone: "554599999999",
    items: [
      {
        id: "item-1",
        productName: "Vestido floral",
        coverImageUrl: null,
        quantity: 1,
        lineTotal: 49.9,
        unitPrice: 49.9,
        packedAt: null,
      },
    ],
    ...overrides,
  };
}

describe("orderAllPacked / packedCount", () => {
  it("returns false when any item is unchecked", () => {
    const order = fakeOrder({
      id: "o-partial",
      items: [
        {
          id: "a",
          productName: "A",
          coverImageUrl: null,
          quantity: 1,
          lineTotal: 10,
          unitPrice: 10,
          packedAt: "2026-08-08T12:00:00.000Z",
        },
        {
          id: "b",
          productName: "B",
          coverImageUrl: null,
          quantity: 1,
          lineTotal: 10,
          unitPrice: 10,
          packedAt: null,
        },
      ],
    });
    expect(orderAllPacked(order)).toBe(false);
    expect(packedCount(order)).toBe(1);
  });

  it("returns true when all items are packed", () => {
    const order = fakeOrder({
      id: "o-full",
      items: [
        {
          id: "a",
          productName: "A",
          coverImageUrl: null,
          quantity: 1,
          lineTotal: 10,
          unitPrice: 10,
          packedAt: "2026-08-08T12:00:00.000Z",
        },
      ],
    });
    expect(orderAllPacked(order)).toBe(true);
  });

  it("returns false for empty items", () => {
    expect(
      orderAllPacked(fakeOrder({ id: "o-empty", items: [], itemCount: 0 })),
    ).toBe(false);
  });
});

describe("filterSeparacaoOrders", () => {
  const paid = fakeOrder({ id: "paid-1", status: "paid" });
  const confirmed = fakeOrder({
    id: "conf-1",
    status: "confirmed",
    customerName: "Bruno",
  });
  const partial = fakeOrder({
    id: "part-1",
    status: "paid",
    customerName: "Carla",
    items: [
      {
        id: "i1",
        productName: "Calça jeans",
        coverImageUrl: null,
        quantity: 1,
        lineTotal: 20,
        unitPrice: 20,
        packedAt: "2026-08-08T10:00:00.000Z",
      },
      {
        id: "i2",
        productName: "Camiseta",
        coverImageUrl: null,
        quantity: 1,
        lineTotal: 15,
        unitPrice: 15,
        packedAt: null,
      },
    ],
  });
  const urgent = fakeOrder({
    id: "urg-1",
    status: "paid",
    fulfillmentType: "delivery",
    customerName: "Diana",
  });

  const all = [paid, confirmed, partial, urgent];

  it("filters a_separar to paid only", () => {
    const result = filterSeparacaoOrders(all, "a_separar", "");
    expect(result.map((o) => o.id).sort()).toEqual(
      ["paid-1", "part-1", "urg-1"].sort(),
    );
  });

  it("filters em_separacao to confirmed or partial packed", () => {
    const result = filterSeparacaoOrders(all, "em_separacao", "");
    expect(result.map((o) => o.id).sort()).toEqual(["conf-1", "part-1"].sort());
  });

  it("filters urgente to delivery fulfillment", () => {
    const result = filterSeparacaoOrders(all, "urgente", "");
    expect(result.map((o) => o.id)).toEqual(["urg-1"]);
  });

  it("searches by customer, code, or piece name", () => {
    expect(
      filterSeparacaoOrders(all, "all", "bruno").map((o) => o.id),
    ).toEqual(["conf-1"]);
    expect(
      filterSeparacaoOrders(all, "all", "calça").map((o) => o.id),
    ).toEqual(["part-1"]);
    expect(
      filterSeparacaoOrders([paid], "all", "RP-2026").map((o) => o.id),
    ).toEqual(["paid-1"]);
  });
});

describe("getSeparacaoStatusLabel", () => {
  it("uses Separação-specific label for paid", () => {
    expect(getSeparacaoStatusLabel("paid")).toBe("Pago · a separar");
  });

  it("delegates other statuses to PT labels", () => {
    expect(getSeparacaoStatusLabel("confirmed")).toBe("Em separação");
    expect(getSeparacaoStatusLabel("na_sacolinha")).toBe("Na sacolinha");
  });
});

describe("applyLocalPackedAt", () => {
  it("updates packedAt without moving queues or changing status", () => {
    const paid = [
      fakeOrder({
        id: "o1",
        status: "paid",
        items: [
          {
            id: "item-1",
            productName: "X",
            coverImageUrl: null,
            quantity: 1,
            lineTotal: 10,
            unitPrice: 10,
            packedAt: null,
          },
        ],
      }),
    ];
    const next = applyLocalPackedAt(
      paid,
      [],
      "o1",
      "item-1",
      "2026-08-08T12:00:00.000Z",
    );
    expect(next.paid[0]!.status).toBe("paid");
    expect(next.paid[0]!.items[0]!.packedAt).toBe("2026-08-08T12:00:00.000Z");
    expect(next.inProgress).toHaveLength(0);
  });
});
