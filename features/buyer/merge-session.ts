/**
 * Pure planners for buyer session merge (SO-03 / D106).
 * I/O lives in `merge-buyer-session.ts` (server-only).
 */

export type CustomerAuthRow = {
  id: string;
  email: string | null;
  auth_user_id: string | null;
};

export type HoldSessionMergeRow = {
  id: string;
  session_id: string;
  customer_id: string | null;
  status: string;
};

export type CustomerLinkPlan =
  | {
      action: "link";
      customerId: string;
      /** Write `customers.auth_user_id` when null or already this user. */
      setAuthUserId: boolean;
    }
  | {
      action: "noop";
      reason: "no_customer" | "auth_claimed_by_other";
    };

export type HoldAttachPlan =
  | {
      action: "attach";
      holdSessionId: string;
      customerId: string;
    }
  | {
      action: "noop";
      reason: "no_hold" | "already_linked" | "linked_other" | "not_active";
    };

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Plans linking an authenticated buyer to a `customers` row by e-mail.
 * Never steals a row already claimed by another auth user.
 */
export function planCustomerAuthLink(
  authUserId: string,
  authEmail: string | null | undefined,
  customer: CustomerAuthRow | null,
): CustomerLinkPlan {
  if (!authEmail?.trim()) {
    return { action: "noop", reason: "no_customer" };
  }

  if (!customer) {
    return { action: "noop", reason: "no_customer" };
  }

  const customerEmail = customer.email
    ? normalizeEmail(customer.email)
    : null;
  if (!customerEmail || customerEmail !== normalizeEmail(authEmail)) {
    return { action: "noop", reason: "no_customer" };
  }

  if (customer.auth_user_id && customer.auth_user_id !== authUserId) {
    return { action: "noop", reason: "auth_claimed_by_other" };
  }

  return {
    action: "link",
    customerId: customer.id,
    setAuthUserId: customer.auth_user_id !== authUserId,
  };
}

/**
 * Plans attaching the anonymous hold cookie session to the customer (D106 / D79).
 */
export function planHoldSessionAttach(
  hold: HoldSessionMergeRow | null,
  customerId: string,
): HoldAttachPlan {
  if (!hold) {
    return { action: "noop", reason: "no_hold" };
  }

  if (hold.status !== "active" && hold.status !== "converted") {
    return { action: "noop", reason: "not_active" };
  }

  if (hold.customer_id === customerId) {
    return { action: "noop", reason: "already_linked" };
  }

  if (hold.customer_id && hold.customer_id !== customerId) {
    return { action: "noop", reason: "linked_other" };
  }

  return {
    action: "attach",
    holdSessionId: hold.id,
    customerId,
  };
}
