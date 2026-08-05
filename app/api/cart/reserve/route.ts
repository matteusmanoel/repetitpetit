import { NextResponse } from "next/server";

import {
  LEGACY_CART_GONE_BODY,
  LEGACY_CART_GONE_STATUS,
} from "@/features/cart/legacy-gone";

/**
 * `POST /api/cart/reserve` — **410 Gone**.
 *
 * Inventory locks use Hold Session only (`POST /api/hold/reserve`, SN-02 / #96).
 * Does not read or mutate `cart_reservations`.
 */
export async function POST() {
  return NextResponse.json(LEGACY_CART_GONE_BODY, {
    status: LEGACY_CART_GONE_STATUS,
  });
}
