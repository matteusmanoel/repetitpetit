import type { Metadata } from "next";

import { SeparacaoSplitHub } from "@/components/admin/SeparacaoSplitHub";

export const metadata: Metadata = {
  title: "Separação · Repeti Petit",
};

/**
 * Separação split (SP-2 / #139 / D121 Variant C).
 * Listas via FulfillmentQueueProvider no layout; check por `packed_at`.
 */
export default function AdminPedidosPage() {
  return <SeparacaoSplitHub />;
}
