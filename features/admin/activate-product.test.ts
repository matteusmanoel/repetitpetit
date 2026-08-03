import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  isValidRpStaffCode,
  planProductActivation,
} from "@/features/admin/activate-product";

describe("RP staff code format", () => {
  it("accepts RP- + 6 digits", () => {
    expect(isValidRpStaffCode("RP-000001")).toBe(true);
    expect(isValidRpStaffCode("RP-123456")).toBe(true);
  });

  it("rejects malformed codes", () => {
    expect(isValidRpStaffCode("RP-1")).toBe(false);
    expect(isValidRpStaffCode("RP-0000001")).toBe(false);
    expect(isValidRpStaffCode("rp-000001")).toBe(false);
    expect(isValidRpStaffCode("SKU-000001")).toBe(false);
  });
});

describe("planProductActivation", () => {
  it("rejects sold products", () => {
    expect(
      planProductActivation({
        id: "p1",
        status: "sold",
        staff_code: null,
        slug: "peça",
      }),
    ).toEqual({
      kind: "reject",
      error: "Peça já vendida — não é possível ativar.",
    });
  });

  it("rejects hold products", () => {
    const plan = planProductActivation({
      id: "p1",
      status: "hold",
      staff_code: "RP-000001",
      slug: "peça",
    });
    expect(plan.kind).toBe("reject");
  });

  it("is idempotent when staff_code already set", () => {
    expect(
      planProductActivation({
        id: "p1",
        status: "available",
        staff_code: "RP-000042",
        slug: "peça",
      }),
    ).toEqual({
      kind: "idempotent",
      staffCode: "RP-000042",
      setAvailable: false,
    });
  });

  it("reactivates inactive products with existing code without assigning a new one", () => {
    expect(
      planProductActivation({
        id: "p1",
        status: "inactive",
        staff_code: "RP-000042",
        slug: "peça",
      }),
    ).toEqual({
      kind: "idempotent",
      staffCode: "RP-000042",
      setAvailable: true,
    });
  });

  it("assigns a code when available and staff_code is null", () => {
    expect(
      planProductActivation({
        id: "p1",
        status: "available",
        staff_code: null,
        slug: "peça",
      }),
    ).toEqual({ kind: "assign" });
  });
});

vi.mock("server-only", () => ({}));

const rpc = vi.fn();
const from = vi.fn();

vi.mock("@/lib/supabase/server-service", () => ({
  createServiceSupabaseClient: () => ({ rpc, from }),
}));

vi.mock("@/features/admin/session", () => ({
  requireAdminSession: vi.fn().mockResolvedValue({
    user: { id: "user-1" },
    admin: { id: "admin-1", email: "admin@test.com" },
  }),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { activateProductAction } from "@/features/admin/product-actions";

function mockSelectProduct(row: {
  id: string;
  status: string;
  staff_code: string | null;
  slug: string;
} | null) {
  const maybeSingle = vi.fn().mockResolvedValue({ data: row, error: null });
  const eq = vi.fn().mockReturnValue({ maybeSingle });
  const select = vi.fn().mockReturnValue({ eq });
  from.mockReturnValue({ select });
  return { select, eq, maybeSingle };
}

describe("activateProductAction", () => {
  beforeEach(() => {
    rpc.mockReset();
    from.mockReset();
  });

  it("returns a clear error for already-sold products", async () => {
    mockSelectProduct({
      id: "prod-sold",
      status: "sold",
      staff_code: "RP-000009",
      slug: "ja-vendida",
    });

    await expect(activateProductAction("prod-sold")).resolves.toEqual({
      ok: false,
      error: "Peça já vendida — não é possível ativar.",
    });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("is idempotent when staff_code is already set (does not call next_rp_staff_code)", async () => {
    mockSelectProduct({
      id: "prod-1",
      status: "available",
      staff_code: "RP-000381",
      slug: "moletom",
    });

    await expect(activateProductAction("prod-1")).resolves.toEqual({
      ok: true,
      staffCode: "RP-000381",
      productId: "prod-1",
    });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("assigns staff_code once on first activation", async () => {
    const loadMaybeSingle = vi.fn().mockResolvedValue({
      data: {
        id: "prod-new",
        status: "available",
        staff_code: null,
        slug: "nova-peca",
      },
      error: null,
    });
    const loadEq = vi.fn().mockReturnValue({ maybeSingle: loadMaybeSingle });
    const loadSelect = vi.fn().mockReturnValue({ eq: loadEq });

    const updateMaybeSingle = vi.fn().mockResolvedValue({
      data: {
        id: "prod-new",
        staff_code: "RP-000001",
        slug: "nova-peca",
      },
      error: null,
    });
    const updateIs = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({ maybeSingle: updateMaybeSingle }),
    });
    const updateEq = vi.fn().mockReturnValue({ is: updateIs });
    const update = vi.fn().mockReturnValue({ eq: updateEq });

    from.mockImplementation(() => ({
      select: loadSelect,
      update,
    }));

    rpc.mockResolvedValue({ data: "RP-000001", error: null });

    await expect(activateProductAction("prod-new")).resolves.toEqual({
      ok: true,
      staffCode: "RP-000001",
      productId: "prod-new",
    });

    expect(rpc).toHaveBeenCalledWith("next_rp_staff_code");
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        staff_code: "RP-000001",
        status: "available",
      }),
    );
  });
});
