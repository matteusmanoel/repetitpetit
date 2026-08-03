/**
 * Pure customer match planner for online checkout (SN-12 / D69).
 * Dedup: email first, then phone. Never invents hold/inventory logic.
 */

export type CustomerMatchRow = {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
};

export type CustomerCheckoutInput = {
  fullName: string;
  phone: string;
  email: string;
};

export type CustomerResolvePlan =
  | {
      action: "reuse";
      customerId: string;
      matchedBy: "email" | "phone";
      updates: {
        full_name: string;
        email?: string;
      };
      /** Structured warn for ops/logs — never blocks checkout. */
      warn?: string;
    }
  | {
      action: "create";
      insert: {
        full_name: string;
        phone: string;
        email: string;
      };
    };

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Plans how to link an online order to a Customer row.
 *
 * Rules (issue #78):
 * 1. Match by email first (exact, case-insensitive via normalized email).
 * 2. Else match by phone.
 * 3. Phone match with null email → fill email; non-null different email → keep existing + warn.
 * 4. No match → create name + phone + email.
 * 5. Email match + different phone row → keep email match + warn (do not merge rows).
 */
export function planCustomerResolve(
  input: CustomerCheckoutInput,
  byEmail: CustomerMatchRow | null,
  byPhone: CustomerMatchRow | null,
): CustomerResolvePlan {
  const email = normalizeEmail(input.email);

  if (byEmail) {
    let warn: string | undefined;
    if (byPhone && byPhone.id !== byEmail.id) {
      warn = `Email ${email} matches customer ${byEmail.id} but phone matches ${byPhone.id}; keeping email match.`;
    }
    return {
      action: "reuse",
      customerId: byEmail.id,
      matchedBy: "email",
      updates: { full_name: input.fullName },
      warn,
    };
  }

  if (byPhone) {
    const updates: { full_name: string; email?: string } = {
      full_name: input.fullName,
    };
    let warn: string | undefined;
    const existingEmail = byPhone.email
      ? normalizeEmail(byPhone.email)
      : null;

    if (!existingEmail) {
      updates.email = email;
    } else if (existingEmail !== email) {
      warn = `Customer ${byPhone.id} already has email ${existingEmail}; checkout email ${email} not overwritten.`;
    }

    return {
      action: "reuse",
      customerId: byPhone.id,
      matchedBy: "phone",
      updates,
      warn,
    };
  }

  return {
    action: "create",
    insert: {
      full_name: input.fullName,
      phone: input.phone,
      email,
    },
  };
}
