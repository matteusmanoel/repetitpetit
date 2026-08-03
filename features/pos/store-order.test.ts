import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  isStoreOrderEligibleStatus,
  toStorePaymentMethod,
} from "@/features/pos/payment-method";

describe("toStorePaymentMethod", () => {
  it("maps API methods to store_payment_method CHECK values", () => {
    expect(toStorePaymentMethod("cash")).toBe("cash");
    expect(toStorePaymentMethod("card_local")).toBe("card");
    expect(toStorePaymentMethod("pix_local")).toBe("pix");
  });
});

describe("isStoreOrderEligibleStatus", () => {
  it("allows available and hold", () => {
    expect(isStoreOrderEligibleStatus("available")).toBe(true);
    expect(isStoreOrderEligibleStatus("hold")).toBe(true);
  });

  it("rejects sold, inactive, reserved", () => {
    expect(isStoreOrderEligibleStatus("sold")).toBe(false);
    expect(isStoreOrderEligibleStatus("inactive")).toBe(false);
    expect(isStoreOrderEligibleStatus("reserved")).toBe(false);
  });
});

vi.mock("server-only", () => ({}));

const from = vi.fn();
const rpc = vi.fn();

vi.mock("@/lib/supabase/server-service", () => ({
  createServiceSupabaseClient: () => ({ from, rpc }),
}));

vi.mock("@/features/admin/session", () => ({
  requireAdminSession: vi.fn().mockResolvedValue({
    user: { id: "user-1" },
    admin: { id: "admin-1", email: "admin@test.com" },
  }),
}));

const markProductsSoldForOrder = vi.fn();
vi.mock("@/features/inventory/apply-transition", () => ({
  markProductsSoldForOrder: (...args: unknown[]) =>
    markProductsSoldForOrder(...args),
}));

const releaseHoldSession = vi.fn();
vi.mock("@/features/cart/hold-session", () => ({
  releaseHoldSession: (...args: unknown[]) => releaseHoldSession(...args),
}));

import { confirmStoreSaleAction } from "@/features/pos/confirm-store-sale";
import { createStoreOrderAction } from "@/features/pos/create-store-order";

type QueryResult = { data: unknown; error: unknown };

function chain(result: QueryResult) {
  const builder: Record<string, unknown> = {};
  const self = () => builder;
  for (const method of [
    "select",
    "insert",
    "update",
    "delete",
    "eq",
    "in",
    "like",
    "order",
    "limit",
  ]) {
    builder[method] = vi.fn(self);
  }
  builder.maybeSingle = vi.fn().mockResolvedValue(result);
  builder.single = vi.fn().mockResolvedValue(result);
  // insert(...).select().single() and bare awaited builders
  Object.assign(builder, {
    then: undefined,
  });
  return builder;
}

describe("createStoreOrderAction", () => {
  beforeEach(() => {
    from.mockReset();
    markProductsSoldForOrder.mockReset();
    releaseHoldSession.mockReset();
  });

  it("rejects products not in available | hold", async () => {
    const productsQuery = chain({
      data: [
        {
          id: "11111111-1111-4111-8111-111111111111",
          name: "Vestido",
          slug: "vestido",
          price: 40,
          cover_image_url: null,
          status: "sold",
          quantity: 1,
        },
      ],
      error: null,
    });
    // .in() resolves via await on builder in some clients — override
    productsQuery.in = vi.fn().mockResolvedValue({
      data: [
        {
          id: "11111111-1111-4111-8111-111111111111",
          name: "Vestido",
          slug: "vestido",
          price: 40,
          cover_image_url: null,
          status: "sold",
          quantity: 1,
        },
      ],
      error: null,
    });

    from.mockImplementation((table: string) => {
      if (table === "products") return productsQuery;
      return chain({ data: null, error: null });
    });

    const result = await createStoreOrderAction({
      productIds: ["11111111-1111-4111-8111-111111111111"],
      staffId: "admin-1",
      paymentMethod: "cash",
    });

    expect(result).toEqual({
      ok: false,
      error: 'A peça "Vestido" não está disponível para venda no balcão.',
      code: "unavailable",
    });
    expect(from).not.toHaveBeenCalledWith("orders");
  });
});

describe("confirmStoreSaleAction", () => {
  const orderId = "22222222-2222-4222-8222-222222222222";
  const productId = "11111111-1111-4111-8111-111111111111";

  beforeEach(() => {
    from.mockReset();
    markProductsSoldForOrder.mockReset();
    releaseHoldSession.mockReset();
    releaseHoldSession.mockResolvedValue({
      status: "ok",
      holdSessionId: "hs-1",
      finalStatus: "cancelled",
    });
  });

  it("marks sold with channel store and writes order_events", async () => {
    const orderLoad = chain({
      data: {
        id: orderId,
        public_code: "RP-2026-0001",
        status: "pending_payment",
        payment_status: "pending",
        channel: "store",
        paid_at: null,
      },
      error: null,
    });

    const itemsQuery = {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: [{ product_id: productId }],
          error: null,
        }),
      }),
    };

    const holdItemsQuery = {
      select: vi.fn().mockReturnValue({
        in: vi.fn().mockResolvedValue({
          data: [{ hold_session_id: "33333333-3333-4333-8333-333333333333" }],
          error: null,
        }),
      }),
    };

    const holdSessionsQuery = {
      select: vi.fn().mockReturnValue({
        in: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [{ session_id: "cookie-1", status: "active" }],
            error: null,
          }),
        }),
      }),
    };

    const orderUpdate = {
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    id: orderId,
                    public_code: "RP-2026-0001",
                    status: "paid",
                  },
                  error: null,
                }),
              }),
            }),
          }),
        }),
      }),
    };

    const eventsInsert = {
      insert: vi.fn().mockResolvedValue({ error: null }),
    };

    let orderFromCount = 0;
    from.mockImplementation((table: string) => {
      if (table === "orders") {
        orderFromCount += 1;
        return orderFromCount === 1 ? orderLoad : orderUpdate;
      }
      if (table === "order_items") return itemsQuery;
      if (table === "hold_items") return holdItemsQuery;
      if (table === "hold_sessions") return holdSessionsQuery;
      if (table === "order_events") return eventsInsert;
      return chain({ data: null, error: null });
    });

    markProductsSoldForOrder.mockResolvedValue({
      ok: true,
      outcome: "applied",
    });

    const result = await confirmStoreSaleAction(orderId, "admin-1");

    expect(result).toEqual({
      ok: true,
      outcome: "applied",
      orderId,
      publicCode: "RP-2026-0001",
    });
    expect(markProductsSoldForOrder).toHaveBeenCalledWith({
      orderId,
      productIds: [productId],
      channel: "store",
    });
    expect(releaseHoldSession).toHaveBeenCalledWith("cookie-1", "cancelled");
    expect(eventsInsert.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        order_id: orderId,
        event_type: "payment_confirmed",
        actor_type: "admin",
        actor_id: "admin-1",
        old_value: "pending_payment",
        new_value: "paid",
      }),
    );
  });

  it("double confirm is idempotent (already_paid, no second order_events)", async () => {
    const orderLoad = chain({
      data: {
        id: orderId,
        public_code: "RP-2026-0001",
        status: "paid",
        payment_status: "paid",
        channel: "store",
        paid_at: "2026-08-03T12:00:00.000Z",
      },
      error: null,
    });

    const itemsQuery = {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: [{ product_id: productId }],
          error: null,
        }),
      }),
    };

    const holdItemsQuery = {
      select: vi.fn().mockReturnValue({
        in: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    };

    const eventsInsert = {
      insert: vi.fn().mockResolvedValue({ error: null }),
    };

    from.mockImplementation((table: string) => {
      if (table === "orders") return orderLoad;
      if (table === "order_items") return itemsQuery;
      if (table === "hold_items") return holdItemsQuery;
      if (table === "order_events") return eventsInsert;
      return chain({ data: null, error: null });
    });

    markProductsSoldForOrder.mockResolvedValue({
      ok: true,
      outcome: "already_sold",
    });

    const result = await confirmStoreSaleAction(orderId, "admin-1");

    expect(result).toEqual({
      ok: true,
      outcome: "already_paid",
      orderId,
      publicCode: "RP-2026-0001",
    });
    expect(markProductsSoldForOrder).toHaveBeenCalledWith({
      orderId,
      productIds: [productId],
      channel: "store",
    });
    expect(eventsInsert.insert).not.toHaveBeenCalled();
  });
});
