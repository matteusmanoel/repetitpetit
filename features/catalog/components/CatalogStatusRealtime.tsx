"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";

import {
  shouldRefreshCatalogForProductChange,
  toastMessageForHoldAvailabilityChange,
  type ProductStatusChangePayload,
} from "@/features/catalog/catalog-realtime";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

type CatalogStatusRealtimeProps = {
  /**
   * Quando definido, só reage a UPDATEs deste product id (PDP).
   * Catálogo omite → qualquer peça hold↔available.
   */
  productId?: string;
};

/**
 * Assinatura enxuta em `products` UPDATE (#98).
 * Toast discreto quando a transição é hold↔available; senão refresh silencioso.
 * Não monta UI — bridge client em páginas RSC.
 */
export function CatalogStatusRealtime({ productId }: CatalogStatusRealtimeProps) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    const channelName = productId
      ? `catalog-pdp-status:${productId}`
      : "catalog-grid-status";

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "products",
          ...(productId ? { filter: `id=eq.${productId}` } : {}),
        },
        (payload) => {
          const previous = payload.old as ProductStatusChangePayload | undefined;
          const next = payload.new as ProductStatusChangePayload | undefined;

          if (!shouldRefreshCatalogForProductChange(previous, next)) {
            return;
          }

          const message = toastMessageForHoldAvailabilityChange(
            previous?.status,
            next?.status,
          );
          if (message) {
            try {
              toast.message(message, { duration: 3500 });
            } catch {
              // Fallback silencioso — refresh abaixo ainda roda.
            }
          }

          router.refresh();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [productId, router]);

  return null;
}
