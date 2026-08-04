import type { Metadata } from "next";

import { PosSellWorkflow } from "@/components/admin/PosSellWorkflow";
import { lookupProductForPos } from "@/features/pos/lookup-product";

export const metadata: Metadata = {
  title: "POS — Admin Repeti Petit",
};

type SearchParams = Promise<{ product?: string }>;

/**
 * POS sell UI (SN-08 / D86).
 * Passport "Vender" deep-links here with `?product=<id>`.
 */
export default async function AdminPosPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const productParam = params.product?.trim() ?? "";

  let initialLookup = null;
  let initialError: string | null = null;
  if (productParam) {
    const result = await lookupProductForPos(productParam);
    if (result.ok) {
      initialLookup = result.data;
    } else {
      initialError = result.error;
    }
  }

  // Remount after Override refresh so client state picks up new sellGate.
  const workflowKey = initialLookup
    ? `${initialLookup.product.id}:${initialLookup.product.status}:${initialLookup.sellGate}`
    : `empty:${productParam}`;

  return (
    <PosSellWorkflow
      key={workflowKey}
      initialLookup={initialLookup}
      initialQuery={
        initialLookup?.product.staffCode ?? productParam
      }
      initialError={initialError}
    />
  );
}
