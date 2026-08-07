import type { User } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/types";

export type CustomerRow = Database["public"]["Tables"]["customers"]["Row"];

export type BuyerSession = {
  user: User;
  customer: CustomerRow;
};

/**
 * Combines Supabase Auth user with `customers` row linked via `auth_user_id`.
 * Pure — distinct from `resolveAdminSession` (admins table). A user in `admins`
 * without a customer link is NOT a buyer session.
 */
export function resolveBuyerSession(
  user: User | null,
  customerRow: CustomerRow | null,
): BuyerSession | null {
  if (!user || !customerRow) {
    return null;
  }

  if (customerRow.auth_user_id !== user.id) {
    return null;
  }

  return { user, customer: customerRow };
}
