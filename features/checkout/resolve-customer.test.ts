import { describe, expect, it } from "vitest";

import { planCustomerResolve } from "@/features/checkout/resolve-customer";

const input = {
  fullName: "Maria Silva",
  phone: "45999999999",
  email: "maria@exemplo.com",
};

describe("planCustomerResolve", () => {
  it("reuses customer matched by email", () => {
    const byEmail = {
      id: "cust-email",
      full_name: "Maria Antiga",
      phone: "45888888888",
      email: "maria@exemplo.com",
    };

    const plan = planCustomerResolve(input, byEmail, null);

    expect(plan).toEqual({
      action: "reuse",
      customerId: "cust-email",
      matchedBy: "email",
      updates: { full_name: "Maria Silva" },
    });
  });

  it("reuses phone match and fills null email", () => {
    const byPhone = {
      id: "cust-phone",
      full_name: "Maria Silva",
      phone: "45999999999",
      email: null,
    };

    const plan = planCustomerResolve(input, null, byPhone);

    expect(plan).toEqual({
      action: "reuse",
      customerId: "cust-phone",
      matchedBy: "phone",
      updates: {
        full_name: "Maria Silva",
        email: "maria@exemplo.com",
      },
    });
  });

  it("keeps existing email on phone match when it differs (warn)", () => {
    const byPhone = {
      id: "cust-phone",
      full_name: "Maria Silva",
      phone: "45999999999",
      email: "outro@exemplo.com",
    };

    const plan = planCustomerResolve(input, null, byPhone);

    expect(plan.action).toBe("reuse");
    if (plan.action !== "reuse") return;
    expect(plan.matchedBy).toBe("phone");
    expect(plan.updates).toEqual({ full_name: "Maria Silva" });
    expect(plan.updates.email).toBeUndefined();
    expect(plan.warn).toContain("not overwritten");
  });

  it("warns and keeps email match when phone points to another customer", () => {
    const byEmail = {
      id: "cust-a",
      full_name: "A",
      phone: "45111111111",
      email: "maria@exemplo.com",
    };
    const byPhone = {
      id: "cust-b",
      full_name: "B",
      phone: "45999999999",
      email: "b@exemplo.com",
    };

    const plan = planCustomerResolve(input, byEmail, byPhone);

    expect(plan.action).toBe("reuse");
    if (plan.action !== "reuse") return;
    expect(plan.customerId).toBe("cust-a");
    expect(plan.matchedBy).toBe("email");
    expect(plan.warn).toContain("keeping email match");
  });

  it("creates a new customer when neither email nor phone match", () => {
    const plan = planCustomerResolve(input, null, null);

    expect(plan).toEqual({
      action: "create",
      insert: {
        full_name: "Maria Silva",
        phone: "45999999999",
        email: "maria@exemplo.com",
      },
    });
  });

  it("normalizes email to lowercase on create", () => {
    const plan = planCustomerResolve(
      { ...input, email: "Maria@Exemplo.COM" },
      null,
      null,
    );

    expect(plan.action).toBe("create");
    if (plan.action !== "create") return;
    expect(plan.insert.email).toBe("maria@exemplo.com");
  });
});
