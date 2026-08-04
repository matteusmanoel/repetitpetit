import { describe, expect, it } from "vitest";

import {
  getHoldExpiringSoonCutoff,
  getSaoPauloDayBounds,
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
