import { NextResponse } from "next/server";

import {
  LEGACY_CART_GONE_BODY,
  LEGACY_CART_GONE_STATUS,
} from "@/features/cart/legacy-gone";

/**
 * `POST /api/cart/release` — **410 Gone**.
 *
 * Inventory release uses Hold Session only (`POST /api/hold/release`, SN-02 / #96).
 * Does not read or mutate `cart_reservations`.
 */
export async function POST() {
  return NextResponse.json(LEGACY_CART_GONE_BODY, {
    status: LEGACY_CART_GONE_STATUS,
  });
}
