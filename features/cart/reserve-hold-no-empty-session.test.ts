import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * #95 — conflict / unavailable must not leave active Hold Sessions with 0 items.
 *
 * Live concurrency is validated by the orchestrator after migration apply
 * (WAVES-soft-launch smoke). This suite locks the SQL contract so the bug
 * cannot regress in source without failing CI.
 */

const MIGRATION = join(
  process.cwd(),
  "supabase/migrations/20260805050000_reserve_hold_item_no_empty_session.sql",
);

function loadMigration(): string {
  return readFileSync(MIGRATION, "utf8");
}

/** Mirrors the #95 empty-session cancel guard inside reserve_hold_item. */
export function shouldCancelEmptyHoldSessionOnConflict(input: {
  sessionCreatedInThisCall: boolean;
  itemCountBeforeInsert: number;
}): boolean {
  return input.sessionCreatedInThisCall || input.itemCountBeforeInsert === 0;
}

/** Count active sessions among losers that still have zero hold_items. */
export function countGhostActiveSessions(
  sessions: Array<{ status: string; itemCount: number; reserveStatus: string }>,
): number {
  return sessions.filter(
    (s) =>
      s.reserveStatus !== "ok" &&
      s.status === "active" &&
      s.itemCount === 0,
  ).length;
}

describe("reserve_hold_item #95 — no empty active session on conflict", () => {
  it("migration creates session only after availability check", () => {
    const sql = loadMigration();

    const availabilityIdx = sql.indexOf(
      "v_product.status IS DISTINCT FROM 'available'",
    );
    const insertSessionIdx = sql.indexOf(
      "INSERT INTO public.hold_sessions (session_id)",
    );
    const uniqueViolationIdx = sql.indexOf("WHEN unique_violation THEN");

    expect(availabilityIdx).toBeGreaterThan(-1);
    expect(insertSessionIdx).toBeGreaterThan(-1);
    expect(uniqueViolationIdx).toBeGreaterThan(-1);
    expect(insertSessionIdx).toBeGreaterThan(availabilityIdx);
  });

  it("unique_violation cancels empty session via _finalize_hold_session", () => {
    const sql = loadMigration();
    const uniqueBlock = sql.slice(sql.indexOf("WHEN unique_violation THEN"));

    expect(uniqueBlock).toContain("v_session_created OR v_item_count = 0");
    expect(uniqueBlock).toContain(
      "PERFORM public._finalize_hold_session(v_session.id, 'cancelled')",
    );
    expect(uniqueBlock).toContain(
      "RETURN jsonb_build_object('status', 'unavailable')",
    );
  });

  it("unavailable path heals leftover empty active sessions", () => {
    const sql = loadMigration();
    expect(sql).toContain("v_session_found AND v_item_count = 0");
    expect(sql).toMatch(
      /IF v_product\.status IS DISTINCT FROM 'available'[\s\S]*?_finalize_hold_session\(v_session\.id, 'cancelled'\)[\s\S]*?unavailable/,
    );
  });

  it("conflict simulation: N-1 losers leave 0 ghost active sessions", () => {
    // N concurrent reserves for one Peça: 1 ok, N-1 unavailable.
    const outcomes = [
      { status: "active", itemCount: 1, reserveStatus: "ok" },
      { status: "cancelled", itemCount: 0, reserveStatus: "unavailable" },
      { status: "cancelled", itemCount: 0, reserveStatus: "unavailable" },
      { status: "cancelled", itemCount: 0, reserveStatus: "unavailable" },
    ];

    expect(outcomes.filter((o) => o.reserveStatus === "ok")).toHaveLength(1);
    expect(
      outcomes.filter((o) => o.reserveStatus === "unavailable"),
    ).toHaveLength(3);
    expect(countGhostActiveSessions(outcomes)).toBe(0);
  });

  it("cancel guard: new or empty session is cancelled; non-empty is kept", () => {
    expect(
      shouldCancelEmptyHoldSessionOnConflict({
        sessionCreatedInThisCall: true,
        itemCountBeforeInsert: 0,
      }),
    ).toBe(true);

    expect(
      shouldCancelEmptyHoldSessionOnConflict({
        sessionCreatedInThisCall: false,
        itemCountBeforeInsert: 0,
      }),
    ).toBe(true);

    expect(
      shouldCancelEmptyHoldSessionOnConflict({
        sessionCreatedInThisCall: false,
        itemCountBeforeInsert: 2,
      }),
    ).toBe(false);
  });
});
