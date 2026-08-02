import { describe, expect, it } from "vitest";

import { minutesRemaining } from "@/features/catalog/reservation-time";

describe("minutesRemaining", () => {
  it("ceil minutes until expiry", () => {
    const now = Date.parse("2026-08-01T12:00:00.000Z");
    const expires = "2026-08-01T12:18:01.000Z";

    expect(minutesRemaining(expires, now)).toBe(19);
  });

  it("returns 0 when already expired", () => {
    const now = Date.parse("2026-08-01T12:20:00.000Z");
    const expires = "2026-08-01T12:18:00.000Z";

    expect(minutesRemaining(expires, now)).toBe(0);
  });

  it("returns 0 for invalid dates", () => {
    expect(minutesRemaining("not-a-date", Date.now())).toBe(0);
  });
});
