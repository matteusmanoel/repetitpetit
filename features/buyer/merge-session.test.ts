import { describe, expect, it } from "vitest";

import {
  BUYER_DEFAULT_NEXT_PATH,
  sanitizeBuyerNextPath,
} from "@/features/buyer/constants";
import {
  planCustomerAuthLink,
  planHoldSessionAttach,
} from "@/features/buyer/merge-session";
import {
  buildBuyerAuthCallbackUrl,
  resolveBuyerAuthNextPath,
} from "@/features/buyer/resolve-auth-next";
import { resolveBuyerSession } from "@/features/buyer/resolve-buyer-session";
import type { User } from "@supabase/supabase-js";

function fakeUser(id: string, email?: string): User {
  return {
    id,
    email,
    app_metadata: {},
    user_metadata: {},
    aud: "authenticated",
    created_at: "2026-01-01T00:00:00Z",
  } as User;
}

describe("planCustomerAuthLink", () => {
  it("links customer matched by email when auth_user_id is null", () => {
    const plan = planCustomerAuthLink(
      "auth-1",
      "maria@exemplo.com",
      {
        id: "cust-1",
        email: "maria@exemplo.com",
        auth_user_id: null,
      },
    );

    expect(plan).toEqual({
      action: "link",
      customerId: "cust-1",
      setAuthUserId: true,
    });
  });

  it("is idempotent when already linked to same auth user", () => {
    const plan = planCustomerAuthLink("auth-1", "Maria@Exemplo.com", {
      id: "cust-1",
      email: "maria@exemplo.com",
      auth_user_id: "auth-1",
    });

    expect(plan).toEqual({
      action: "link",
      customerId: "cust-1",
      setAuthUserId: false,
    });
  });

  it("does not steal a customer claimed by another auth user", () => {
    const plan = planCustomerAuthLink("auth-2", "maria@exemplo.com", {
      id: "cust-1",
      email: "maria@exemplo.com",
      auth_user_id: "auth-1",
    });

    expect(plan).toEqual({
      action: "noop",
      reason: "auth_claimed_by_other",
    });
  });

  it("noops when no customer row", () => {
    expect(
      planCustomerAuthLink("auth-1", "nova@exemplo.com", null),
    ).toEqual({ action: "noop", reason: "no_customer" });
  });
});

describe("planHoldSessionAttach", () => {
  it("attaches active hold without customer_id", () => {
    expect(
      planHoldSessionAttach(
        {
          id: "hs-1",
          session_id: "cookie-1",
          customer_id: null,
          status: "active",
        },
        "cust-1",
      ),
    ).toEqual({
      action: "attach",
      holdSessionId: "hs-1",
      customerId: "cust-1",
    });
  });

  it("allows converted hold still missing customer_id", () => {
    expect(
      planHoldSessionAttach(
        {
          id: "hs-2",
          session_id: "cookie-1",
          customer_id: null,
          status: "converted",
        },
        "cust-1",
      ).action,
    ).toBe("attach");
  });

  it("noops when already linked or claimed", () => {
    const already = planHoldSessionAttach(
      {
        id: "hs-1",
        session_id: "c",
        customer_id: "cust-1",
        status: "active",
      },
      "cust-1",
    );
    expect(already).toEqual({ action: "noop", reason: "already_linked" });

    const claimed = planHoldSessionAttach(
      {
        id: "hs-1",
        session_id: "c",
        customer_id: "cust-other",
        status: "active",
      },
      "cust-1",
    );
    expect(claimed).toEqual({ action: "noop", reason: "linked_other" });
  });
});

describe("resolveBuyerSession", () => {
  it("requires matching customers.auth_user_id — not admin", () => {
    const user = fakeUser("auth-1", "a@b.com");
    expect(resolveBuyerSession(user, null)).toBeNull();
    expect(
      resolveBuyerSession(user, {
        id: "c1",
        full_name: "A",
        phone: "1",
        email: "a@b.com",
        auth_user_id: "other",
        created_at: "",
        updated_at: "",
      }),
    ).toBeNull();
    expect(
      resolveBuyerSession(user, {
        id: "c1",
        full_name: "A",
        phone: "1",
        email: "a@b.com",
        auth_user_id: "auth-1",
        created_at: "",
        updated_at: "",
      })?.customer.id,
    ).toBe("c1");
  });
});

describe("sanitizeBuyerNextPath", () => {
  it("allows relative storefront paths only", () => {
    expect(sanitizeBuyerNextPath("/sacolinha")).toBe("/sacolinha");
    expect(sanitizeBuyerNextPath("/pedido/RP-2026-0001")).toBe(
      "/pedido/RP-2026-0001",
    );
    expect(sanitizeBuyerNextPath("https://evil.com")).toBe(
      BUYER_DEFAULT_NEXT_PATH,
    );
    expect(sanitizeBuyerNextPath("//evil.com")).toBe(BUYER_DEFAULT_NEXT_PATH);
    expect(sanitizeBuyerNextPath("/admin")).toBe(BUYER_DEFAULT_NEXT_PATH);
    expect(sanitizeBuyerNextPath("/api/secret")).toBe(BUYER_DEFAULT_NEXT_PATH);
  });
});

describe("resolveBuyerAuthNextPath", () => {
  it("prefers query next over cookie", () => {
    expect(
      resolveBuyerAuthNextPath({
        queryNext: "/pedido/RP-1",
        cookieNext: "/sacolinha",
      }),
    ).toBe("/pedido/RP-1");
  });

  it("falls back to cookie when query is missing (Supabase strip)", () => {
    expect(
      resolveBuyerAuthNextPath({
        queryNext: null,
        cookieNext: "/sacolinha",
      }),
    ).toBe("/sacolinha");
  });

  it("defaults to /sacolinha when both missing", () => {
    expect(resolveBuyerAuthNextPath({})).toBe(BUYER_DEFAULT_NEXT_PATH);
  });

  it("sanitizes hostile cookie/query values", () => {
    expect(
      resolveBuyerAuthNextPath({
        queryNext: "https://evil.com",
        cookieNext: "//evil.com",
      }),
    ).toBe(BUYER_DEFAULT_NEXT_PATH);
  });
});

describe("buildBuyerAuthCallbackUrl", () => {
  it("embeds sanitized next on /auth/callback", () => {
    expect(
      buildBuyerAuthCallbackUrl("https://repetipetit.com.br/", "/sacolinha"),
    ).toBe(
      "https://repetipetit.com.br/auth/callback?next=%2Fsacolinha",
    );
  });
});
