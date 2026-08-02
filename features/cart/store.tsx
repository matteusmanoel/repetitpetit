"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Item do carrinho — peça única com reserva (D29 TTL 20 min).
 * Sem gift_message / preferredFulfillment (reuse-map ADAPT).
 */
export type CartItem = {
  productId: string;
  name: string;
  slug: string;
  price: number;
  coverImageUrl: string | null;
  /** Peça única: sempre 1 no MVP. */
  quantity: 1;
  reservationId: string;
  /** ISO-8601 — espelha `cart_reservations.expires_at`. */
  expiresAt: string;
};

type CartState = {
  items: CartItem[];
  isOpen: boolean;
  hasHydrated: boolean;
  setHasHydrated: (value: boolean) => void;
  openCart: () => void;
  closeCart: () => void;
  setOpen: (open: boolean) => void;
  /** Upsert por `productId` (peça única) e abre o sheet. */
  addItem: (item: CartItem) => void;
  removeItem: (productId: string) => void;
  getItemCount: () => number;
  getSubtotal: () => number;
  hasProduct: (productId: string) => boolean;
};

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      hasHydrated: false,

      setHasHydrated: (value) => set({ hasHydrated: value }),

      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      setOpen: (open) => set({ isOpen: open }),

      addItem: (item) =>
        set((state) => {
          const without = state.items.filter((i) => i.productId !== item.productId);
          return {
            items: [...without, item],
            isOpen: true,
          };
        }),

      removeItem: (productId) =>
        set((state) => ({
          items: state.items.filter((i) => i.productId !== productId),
        })),

      getItemCount: () => get().items.length,

      getSubtotal: () =>
        get().items.reduce((sum, item) => sum + item.price * item.quantity, 0),

      hasProduct: (productId) => get().items.some((i) => i.productId === productId),
    }),
    {
      name: "rp-cart",
      partialize: (state) => ({ items: state.items }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
