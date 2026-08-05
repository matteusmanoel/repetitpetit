import { describe, expect, it } from "vitest";

import { POST as releasePost } from "@/app/api/cart/release/route";
import { POST as reservePost } from "@/app/api/cart/reserve/route";
import {
  LEGACY_CART_GONE_BODY,
  LEGACY_CART_GONE_STATUS,
} from "@/features/cart/legacy-gone";

describe("legacy cart routes → 410 Gone", () => {
  it("POST /api/cart/reserve returns 410 with Hold Session guidance", async () => {
    const response = await reservePost();
    const body = await response.json();

    expect(response.status).toBe(LEGACY_CART_GONE_STATUS);
    expect(body).toEqual(LEGACY_CART_GONE_BODY);
    expect(body.message).toMatch(/Hold Session/);
  });

  it("POST /api/cart/release returns 410 with Hold Session guidance", async () => {
    const response = await releasePost();
    const body = await response.json();

    expect(response.status).toBe(LEGACY_CART_GONE_STATUS);
    expect(body).toEqual(LEGACY_CART_GONE_BODY);
    expect(body.message).toMatch(/Hold Session/);
  });
});
