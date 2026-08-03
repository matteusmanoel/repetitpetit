import { describe, expect, it } from "vitest";

import {
  applyProductStatusToCache,
  isProductStatusRealtimeRow,
  shouldRefreshDashboardForHoldEvent,
} from "@/features/admin/fulfillment/inventory-realtime";

describe("isProductStatusRealtimeRow", () => {
  it("accepts hold / available / sold with id", () => {
    expect(
      isProductStatusRealtimeRow({ id: "p1", status: "hold" }),
    ).toBe(true);
    expect(
      isProductStatusRealtimeRow({ id: "p1", status: "available" }),
    ).toBe(true);
    expect(
      isProductStatusRealtimeRow({ id: "p1", status: "sold" }),
    ).toBe(true);
  });

  it("rejects partial or irrelevant payloads without throwing", () => {
    expect(isProductStatusRealtimeRow(null)).toBe(false);
    expect(isProductStatusRealtimeRow({})).toBe(false);
    expect(isProductStatusRealtimeRow({ id: "p1" })).toBe(false);
    expect(
      isProductStatusRealtimeRow({ id: "p1", status: "inactive" }),
    ).toBe(false);
  });
});

describe("applyProductStatusToCache", () => {
  it("updates hold and available", () => {
    expect(
      applyProductStatusToCache({}, { id: "p1", status: "hold" }),
    ).toEqual({ p1: "hold" });
    expect(
      applyProductStatusToCache(
        { p1: "hold" },
        { id: "p1", status: "available" },
      ),
    ).toEqual({ p1: "available" });
  });

  it("removes sold products from the cache", () => {
    expect(
      applyProductStatusToCache(
        { p1: "hold", p2: "available" },
        { id: "p1", status: "sold" },
      ),
    ).toEqual({ p2: "available" });
  });

  it("ignores malformed events without crashing", () => {
    const cache = { p1: "hold" };
    expect(applyProductStatusToCache(cache, null)).toEqual(cache);
    expect(applyProductStatusToCache(cache, { status: "sold" })).toEqual(
      cache,
    );
  });
});

describe("shouldRefreshDashboardForHoldEvent", () => {
  it("refreshes on known hold session statuses", () => {
    expect(shouldRefreshDashboardForHoldEvent("active")).toBe(true);
    expect(shouldRefreshDashboardForHoldEvent("expired")).toBe(true);
    expect(shouldRefreshDashboardForHoldEvent("cancelled")).toBe(true);
    expect(shouldRefreshDashboardForHoldEvent("converted")).toBe(true);
  });

  it("refreshes when status is missing (INSERT/DELETE partial)", () => {
    expect(shouldRefreshDashboardForHoldEvent(undefined)).toBe(true);
    expect(shouldRefreshDashboardForHoldEvent(null)).toBe(true);
  });
});
