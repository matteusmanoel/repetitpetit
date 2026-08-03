import type { ProductStatus } from "@/features/admin/product-constants";

/** Permanent staff code format: RP- + 6 zero-padded digits (D64 / SN-09). */
export const RP_STAFF_CODE_PATTERN = /^RP-\d{6}$/;

export type ActivationProduct = {
  id: string;
  status: ProductStatus;
  staff_code: string | null;
  slug: string;
};

export type ActivationPlan =
  | { kind: "reject"; error: string }
  | {
      kind: "idempotent";
      staffCode: string;
      /** Re-activation from inactive → available (D67). */
      setAvailable: boolean;
    }
  | { kind: "assign" };

/**
 * Pure activation rules for SN-09.
 * - sold / hold / reserved → reject
 * - available | inactive with existing staff_code → idempotent (no new code)
 * - available | inactive without code → assign once
 */
export function planProductActivation(
  product: ActivationProduct,
): ActivationPlan {
  if (product.status === "sold") {
    return {
      kind: "reject",
      error: "Peça já vendida — não é possível ativar.",
    };
  }

  if (product.status === "hold") {
    return {
      kind: "reject",
      error: "Peça em hold — não é possível ativar enquanto a reserva estiver ativa.",
    };
  }

  if (product.status === "reserved") {
    return {
      kind: "reject",
      error: "Peça com status legado de reserva — libere antes de ativar.",
    };
  }

  if (product.status !== "available" && product.status !== "inactive") {
    return {
      kind: "reject",
      error: "Só é possível ativar peças disponíveis ou inativas.",
    };
  }

  if (product.staff_code) {
    return {
      kind: "idempotent",
      staffCode: product.staff_code,
      setAvailable: product.status === "inactive",
    };
  }

  return { kind: "assign" };
}

export function isValidRpStaffCode(code: string): boolean {
  return RP_STAFF_CODE_PATTERN.test(code);
}
