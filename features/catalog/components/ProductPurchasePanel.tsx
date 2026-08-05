"use client";

import { AddToCartButton } from "@/features/catalog/components/AddToCartButton";
import { OwnHoldActions } from "@/features/catalog/components/OwnHoldActions";
import { ReservedByOtherActions } from "@/features/catalog/components/ReservedByOtherActions";
import { resolvePdpPurchaseState } from "@/features/catalog/pdp-purchase-state";
import type { ReservationView } from "@/features/catalog/types";
import type { Database } from "@/lib/supabase/types";

type ProductPurchasePanelProps = {
  productId: string;
  name: string;
  slug: string;
  price: number;
  coverImageUrl: string | null;
  productStatus: Database["public"]["Enums"]["product_status"];
  reservation: ReservationView;
};

/**
 * CTA da PDP: dona (Finalizar/Liberar/Voltar), outras (Reservada), ou Comprar Agora.
 */
export function ProductPurchasePanel({
  productId,
  name,
  slug,
  price,
  coverImageUrl,
  productStatus,
  reservation,
}: ProductPurchasePanelProps) {
  const state = resolvePdpPurchaseState({
    productStatus,
    reservation,
  });

  if (state.mode === "own_hold") {
    return (
      <OwnHoldActions productId={productId} expiresAt={state.expiresAt} />
    );
  }

  if (state.mode === "reserved_by_other") {
    return <ReservedByOtherActions />;
  }

  if (state.mode === "unavailable") {
    return (
      <ReservedByOtherActions />
    );
  }

  return (
    <AddToCartButton
      productId={productId}
      name={name}
      slug={slug}
      price={price}
      coverImageUrl={coverImageUrl}
      reservation={reservation}
    />
  );
}
