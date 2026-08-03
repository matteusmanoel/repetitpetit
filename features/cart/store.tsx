"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Espelho UI da Hold Session (D66) — a verdade está no servidor.
 * `expiresAt` é o TTL da sessão inteira (D29), não por item.
 */
export type CartItem = {
  productId: string;
  name: string;
  slug: string;
  price: number;
  coverImageUrl: string | null;
  /** Peça única: sempre 1 no MVP. */
  quantity: 1;
  /** Compat: id do hold_item ou hold_session; não é fonte de verdade. */
  reservationId: string;
  /** ISO-8601 — espelha `hold_sessions.expires_at`. */
  expiresAt: string;
};

type CartState = {
  items: CartItem[];
  /** `hold_sessions.id` (UUID da linha), não o cookie. */
  holdSessionId: string | null;
  /** TTL da sessão (`hold_sessions.expires_at`). */
  expiresAt: string | null;
  isOpen: boolean;
  hasHydrated: boolean;
  setHasHydrated: (value: boolean) => void;
  openCart: () => void;
  closeCart: () => void;
  setOpen: (open: boolean) => void;
  setHoldMeta: (holdSessionId: string, expiresAt: string) => void;
  /** Upsert por `productId` (peça única) e abre o sheet. */
  addItem: (item: CartItem, hold?: { holdSessionId: string; expiresAt: string }) => void;
  removeItem: (productId: string) => void;
  clearHold: () => void;
  hydrateFromServer: (payload: {
    holdSessionId: string;
    expiresAt: string;
    items: CartItem[];
  }) => void;
  getItemCount: () => number;
  getSubtotal: () => number;
  hasProduct: (productId: string) => boolean;
};

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      holdSessionId: null,
      expiresAt: null,
      isOpen: false,
      hasHydrated: false,

      setHasHydrated: (value) => set({ hasHydrated: value }),

      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      setOpen: (open) => set({ isOpen: open }),

      setHoldMeta: (holdSessionId, expiresAt) =>
        set({ holdSessionId, expiresAt }),

      addItem: (item, hold) =>
        set((state) => {
          const without = state.items.filter((i) => i.productId !== item.productId);
          const expiresAt = hold?.expiresAt ?? item.expiresAt;
          const items = without.map((i) => ({ ...i, expiresAt })).concat({
            ...item,
            expiresAt,
          });
          return {
            items,
            isOpen: true,
            holdSessionId: hold?.holdSessionId ?? state.holdSessionId,
            expiresAt: hold?.expiresAt ?? state.expiresAt ?? expiresAt,
          };
        }),

      removeItem: (productId) =>
        set((state) => {
          const items = state.items.filter((i) => i.productId !== productId);
          if (items.length === 0) {
            return { items, holdSessionId: null, expiresAt: null };
          }
          return { items };
        }),

      clearHold: () =>
        set({
          items: [],
          holdSessionId: null,
          expiresAt: null,
        }),

      hydrateFromServer: (payload) =>
        set({
          holdSessionId: payload.holdSessionId,
          expiresAt: payload.expiresAt,
          items: payload.items.map((item) => ({
            ...item,
            expiresAt: payload.expiresAt,
          })),
        }),

      getItemCount: () => get().items.length,

      getSubtotal: () =>
        get().items.reduce((sum, item) => sum + item.price * item.quantity, 0),

      hasProduct: (productId) => get().items.some((i) => i.productId === productId),
    }),
    {
      name: "rp-cart",
      partialize: (state) => ({
        items: state.items,
        holdSessionId: state.holdSessionId,
        expiresAt: state.expiresAt,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
