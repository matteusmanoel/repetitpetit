import { describe, expect, it } from "vitest";

import {
  fulfillmentOrderIdSchema,
  shipOrderSchema,
  toggleOrderItemPackedSchema,
} from "@/features/admin/fulfillment/schemas";

describe("fulfillmentOrderIdSchema", () => {
  it("accepts uuid", () => {
    const result = fulfillmentOrderIdSchema.safeParse({
      orderId: "11111111-1111-4111-8111-111111111111",
    });
    expect(result.success).toBe(true);
  });

  it("rejects non-uuid", () => {
    const result = fulfillmentOrderIdSchema.safeParse({ orderId: "nope" });
    expect(result.success).toBe(false);
  });
});

describe("shipOrderSchema", () => {
  it("requires non-empty tracking code", () => {
    const empty = shipOrderSchema.safeParse({
      orderId: "11111111-1111-4111-8111-111111111111",
      trackingCode: "   ",
    });
    expect(empty.success).toBe(false);

    const ok = shipOrderSchema.safeParse({
      orderId: "11111111-1111-4111-8111-111111111111",
      trackingCode: " AA123456789BR ",
    });
    expect(ok.success).toBe(true);
    if (ok.success) {
      expect(ok.data.trackingCode).toBe("AA123456789BR");
    }
  });
});

describe("toggleOrderItemPackedSchema", () => {
  it("accepts uuid", () => {
    const result = toggleOrderItemPackedSchema.safeParse({
      orderItemId: "22222222-2222-4222-8222-222222222222",
    });
    expect(result.success).toBe(true);
  });

  it("rejects non-uuid", () => {
    const result = toggleOrderItemPackedSchema.safeParse({
      orderItemId: "nope",
    });
    expect(result.success).toBe(false);
  });
});
