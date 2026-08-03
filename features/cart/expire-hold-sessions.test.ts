import { describe, expect, it, vi, beforeEach } from "vitest";

/**
 * SN-03 contract tests for the expire RPC wrapper shape.
 * Live expire semantics are validated via SQL against expire_due_hold_sessions().
 */

vi.mock("server-only", () => ({}));

const rpc = vi.fn();

vi.mock("@/lib/supabase/server-service", () => ({
  createServiceSupabaseClient: () => ({ rpc }),
}));

import { createServiceSupabaseClient } from "@/lib/supabase/server-service";

async function runExpireDueHoldSessions() {
  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase.rpc("expire_due_hold_sessions");
  if (error) throw error;
  return data as {
    status: string;
    expired_count: number;
    failed_count: number;
    hold_session_ids: string[];
  };
}

describe("expire_due_hold_sessions RPC contract", () => {
  beforeEach(() => {
    rpc.mockReset();
  });

  it("happy path returns expired_count", async () => {
    rpc.mockResolvedValue({
      data: {
        status: "ok",
        expired_count: 2,
        failed_count: 0,
        hold_session_ids: ["a", "b"],
      },
      error: null,
    });

    await expect(runExpireDueHoldSessions()).resolves.toEqual({
      status: "ok",
      expired_count: 2,
      failed_count: 0,
      hold_session_ids: ["a", "b"],
    });
    expect(rpc).toHaveBeenCalledWith("expire_due_hold_sessions");
  });

  it("empty run returns zero expired", async () => {
    rpc.mockResolvedValue({
      data: {
        status: "ok",
        expired_count: 0,
        failed_count: 0,
        hold_session_ids: [],
      },
      error: null,
    });

    await expect(runExpireDueHoldSessions()).resolves.toMatchObject({
      status: "ok",
      expired_count: 0,
    });
  });
});
