"use server";

import { requireAdminSession } from "@/features/admin/session";
import {
  lookupProductForPos,
  type LookupProductResult,
} from "@/features/pos/lookup-product";

/**
 * Admin wrapper for POS product search (RP code / UUID / Passport URL).
 */
export async function lookupProductForPosAction(
  query: string,
): Promise<LookupProductResult> {
  await requireAdminSession();
  return lookupProductForPos(query);
}
