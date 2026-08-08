import { describe, expect, it } from "vitest";

import {
  aggregateTopCustomers,
  buildAccessMockSeries,
  buildChannelDaySeries,
  getHoldExpiringSoonCutoff,
  getSaoPauloDateKey,
  getSaoPauloDayBounds,
  getSaoPauloRangeStartIso,
  HOLD_EXPIRING_SOON_MS,
} from "@/features/admin/dashboard/kpi-helpers";

describe("getSaoPauloDayBounds", () => {
  it("returns BRT midnight bounds for a midday UTC instant", () => {
    // 2026-08-03 15:30 UTC = 12:30 BRT → dia 3
    const { startIso, nextDayStartIso } = getSaoPauloDayBounds(
      new Date("2026-08-03T15:30:00.000Z"),
    );

    expect(startIso).toBe("2026-08-03T03:00:00.000Z");
    expect(nextDayStartIso).toBe("2026-08-04T03:00:00.000Z");
  });

  it("keeps the BRT calendar day near UTC midnight", () => {
    // 2026-08-04 01:00 UTC = 2026-08-03 22:00 BRT → ainda dia 3
    const { startIso, nextDayStartIso } = getSaoPauloDayBounds(
      new Date("2026-08-04T01:00:00.000Z"),
    );

    expect(startIso).toBe("2026-08-03T03:00:00.000Z");
    expect(nextDayStartIso).toBe("2026-08-04T03:00:00.000Z");
  });
});

describe("getHoldExpiringSoonCutoff", () => {
  it("adds five minutes to now", () => {
    const now = new Date("2026-08-03T12:00:00.000Z");
    expect(getHoldExpiringSoonCutoff(now)).toBe(
      new Date(now.getTime() + HOLD_EXPIRING_SOON_MS).toISOString(),
    );
  });
});

describe("getSaoPauloDateKey / range", () => {
  it("returns YYYY-MM-DD in BRT", () => {
    expect(getSaoPauloDateKey("2026-08-04T01:00:00.000Z")).toBe("2026-08-03");
    expect(getSaoPauloDateKey("2026-08-03T15:30:00.000Z")).toBe("2026-08-03");
  });

  it("starts 7 civil days inclusive of today", () => {
    // hoje BRT = 2026-08-03 → 7d começa 2026-07-28 00:00 BRT
    const start = getSaoPauloRangeStartIso(
      7,
      new Date("2026-08-03T15:30:00.000Z"),
    );
    expect(start).toBe("2026-07-28T03:00:00.000Z");
  });
});

describe("buildChannelDaySeries", () => {
  it("fills 7 empty days and sums by channel", () => {
    const now = new Date("2026-08-03T15:30:00.000Z");
    const series = buildChannelDaySeries(
      [
        {
          paidAt: "2026-08-03T12:00:00.000Z",
          totalAmount: 100,
          channel: "sacolinha",
        },
        {
          paidAt: "2026-08-03T14:00:00.000Z",
          totalAmount: 40,
          channel: "balcao",
        },
        {
          paidAt: "2026-08-02T20:00:00.000Z",
          totalAmount: 25,
          channel: "entrega",
        },
      ],
      7,
      now,
    );

    expect(series).toHaveLength(7);
    expect(series[6]?.dayKey).toBe("2026-08-03");
    expect(series[6]?.sacolinha).toBe(100);
    expect(series[6]?.balcao).toBe(40);
    expect(series[5]?.dayKey).toBe("2026-08-02");
    expect(series[5]?.entrega).toBe(25);
  });
});

describe("aggregateTopCustomers", () => {
  it("sums amounts and ranks by total", () => {
    const top = aggregateTopCustomers(
      [
        { customerId: "a", customerName: "Ana", totalAmount: 50 },
        { customerId: "b", customerName: "Bia", totalAmount: 80 },
        { customerId: "a", customerName: "Ana", totalAmount: 40 },
      ],
      2,
    );

    expect(top).toEqual([
      { customerId: "a", name: "Ana", orders: 2, totalAmount: 90 },
      { customerId: "b", name: "Bia", orders: 1, totalAmount: 80 },
    ]);
  });
});

describe("buildAccessMockSeries", () => {
  it("is deterministic for the same day keys", () => {
    const keys = ["2026-08-01", "2026-08-02"];
    expect(buildAccessMockSeries(keys)).toEqual(buildAccessMockSeries(keys));
    expect(buildAccessMockSeries(keys)[0]?.value).toBeGreaterThan(0);
  });
});
