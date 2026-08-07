import "server-only";

import { peekCartSessionId } from "@/features/cart/session";
import {
  planCustomerAuthLink,
  planHoldSessionAttach,
} from "@/features/buyer/merge-session";
import { createServiceSupabaseClient } from "@/lib/supabase/server-service";

export type MergeBuyerSessionResult = {
  customerId: string | null;
  linkedAuth: boolean;
  attachedHold: boolean;
};

/**
 * After magic-link exchange: link Auth user → customer by e-mail,
 * then attach anonymous `rp_cart_session` hold to that customer (D106).
 *
 * Idempotent. Does not touch `admins`.
 */
export async function mergeBuyerSessionAfterAuth(input: {
  authUserId: string;
  email: string | null | undefined;
}): Promise<MergeBuyerSessionResult> {
  const email = input.email?.trim().toLowerCase() ?? null;
  const service = createServiceSupabaseClient();

  let customer: {
    id: string;
    email: string | null;
    auth_user_id: string | null;
  } | null = null;

  if (email) {
    const { data } = await service
      .from("customers")
      .select("id, email, auth_user_id")
      .eq("email", email)
      .maybeSingle();
    customer = data;
  }

  const linkPlan = planCustomerAuthLink(
    input.authUserId,
    email,
    customer,
  );

  let customerId: string | null = null;
  let linkedAuth = false;

  if (linkPlan.action === "link") {
    customerId = linkPlan.customerId;
    if (linkPlan.setAuthUserId) {
      const { error } = await service
        .from("customers")
        .update({
          auth_user_id: input.authUserId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", linkPlan.customerId)
        .is("auth_user_id", null);

      if (error) {
        console.error("Falha ao vincular auth_user_id ao customer:", error);
      } else {
        linkedAuth = true;
      }

      // Re-read in case another request already linked this user.
      if (!linkedAuth) {
        const { data: existing } = await service
          .from("customers")
          .select("id, auth_user_id")
          .eq("auth_user_id", input.authUserId)
          .maybeSingle();
        if (existing) {
          customerId = existing.id;
          linkedAuth = true;
        }
      }
    } else {
      linkedAuth = true;
    }
  }

  let attachedHold = false;

  if (customerId) {
    const browserSessionId = await peekCartSessionId();
    if (browserSessionId) {
      const { data: hold } = await service
        .from("hold_sessions")
        .select("id, session_id, customer_id, status")
        .eq("session_id", browserSessionId)
        .maybeSingle();

      const holdPlan = planHoldSessionAttach(hold, customerId);
      if (holdPlan.action === "attach") {
        const { error } = await service
          .from("hold_sessions")
          .update({
            customer_id: customerId,
            updated_at: new Date().toISOString(),
          })
          .eq("id", holdPlan.holdSessionId)
          .is("customer_id", null);

        if (error) {
          console.error("Falha ao anexar hold_session ao customer:", error);
        } else {
          attachedHold = true;
        }
      }
    }
  }

  return { customerId, linkedAuth, attachedHold };
}
