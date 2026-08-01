import { describe, expect, it } from "vitest";

import { cartProductBodySchema } from "@/features/cart/schemas";

describe("cartProductBodySchema", () => {
  it("accepts a valid productId UUID", () => {
    const parsed = cartProductBodySchema.safeParse({
      productId: "9d25a035-6d4b-4d8c-ade1-d2a228f4ffcb",
    });

    expect(parsed.success).toBe(true);
  });

  it("rejects missing or invalid productId", () => {
    expect(cartProductBodySchema.safeParse({}).success).toBe(false);
    expect(cartProductBodySchema.safeParse({ productId: "not-a-uuid" }).success).toBe(false);
  });
});
