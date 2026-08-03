"use server";

import { requireAdminSession } from "@/features/admin/session";
import { executeOverrideAction } from "@/features/override/execute-override-action";
import type { ExecuteOverrideActionResult } from "@/features/override/execute-override-action";

/**
 * Admin server action for Override dialog (Passport / POS reuse).
 * Staff id comes from the authenticated admin session.
 */
export async function executeOverrideActionFromAdmin(input: {
  productId: string;
  reason: string;
  context?: string;
}): Promise<ExecuteOverrideActionResult> {
  const session = await requireAdminSession();

  return executeOverrideAction({
    productId: input.productId,
    staffId: session.admin.id,
    reason: input.reason,
    context: input.context,
  });
}
