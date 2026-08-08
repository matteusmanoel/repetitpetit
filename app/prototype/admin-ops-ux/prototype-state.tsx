"use client";

/**
 * PROTOTYPE — in-memory state for Admin Ops UX (rev.2).
 */

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  INITIAL_CATEGORIES,
  MOCK_NOTIFICATIONS,
  MOCK_ORDERS,
  MOCK_PRODUCTS,
  type CadastroTab,
  type CaptureDraft,
  type MockCategory,
  type MockNotification,
  type MockOrder,
  type MockProductRow,
  type ScreenId,
  type SeparacaoFilter,
} from "./mock-data";

type PrototypeState = {
  screen: ScreenId;
  setScreen: (s: ScreenId) => void;
  orders: MockOrder[];
  togglePacked: (orderId: string, itemId: string) => void;
  filter: SeparacaoFilter;
  setFilter: (f: SeparacaoFilter) => void;
  selectedOrderId: string | null;
  setSelectedOrderId: (id: string | null) => void;
  notifOpen: boolean;
  setNotifOpen: (v: boolean) => void;
  notifications: MockNotification[];
  dismissNotif: (id: string) => void;
  clearAllNotifs: () => void;
  categories: MockCategory[];
  addCategory: (name: string) => MockCategory;
  products: MockProductRow[];
  upsertProduct: (row: MockProductRow) => void;
  captureSeries: CaptureDraft[];
  selectedCaptureId: string | null;
  setSelectedCaptureId: (id: string | null) => void;
  cadastroTab: CadastroTab;
  setCadastroTab: (t: CadastroTab) => void;
  addCapture: (photoDataUrl: string) => string;
  setCaptureAudio: (id: string, locked?: boolean) => void;
  updateCapture: (id: string, patch: Partial<CaptureDraft>) => void;
  removeCapture: (id: string) => void;
  resetSeries: () => void;
};

const Ctx = createContext<PrototypeState | null>(null);

export function PrototypeStateProvider({ children }: { children: ReactNode }) {
  const [screen, setScreen] = useState<ScreenId>("separacao");
  const [orders, setOrders] = useState(MOCK_ORDERS);
  const [filter, setFilter] = useState<SeparacaoFilter>("a_separar");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(
    MOCK_ORDERS[0]?.id ?? null,
  );
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);
  const [categories, setCategories] = useState(INITIAL_CATEGORIES);
  const [products, setProducts] = useState(MOCK_PRODUCTS);
  const [captureSeries, setCaptureSeries] = useState<CaptureDraft[]>([]);
  const [selectedCaptureId, setSelectedCaptureId] = useState<string | null>(
    null,
  );
  const [cadastroTab, setCadastroTab] = useState<CadastroTab>("captura");

  const togglePacked = useCallback((orderId: string, itemId: string) => {
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== orderId) return o;
        return {
          ...o,
          items: o.items.map((it) => {
            if (it.id !== itemId) return it;
            return {
              ...it,
              packedAt: it.packedAt ? null : new Date().toISOString(),
            };
          }),
        };
      }),
    );
  }, []);

  const dismissNotif = useCallback((id: string) => {
    setNotifications((n) => n.filter((x) => x.id !== id));
  }, []);

  const clearAllNotifs = useCallback(() => {
    setNotifications([]);
    setNotifOpen(false);
  }, []);

  const addCategory = useCallback((name: string) => {
    const trimmed = name.trim();
    const row = {
      id: `c-${crypto.randomUUID().slice(0, 8)}`,
      name: trimmed || "Nova",
    };
    setCategories((c) => [...c, row]);
    return row;
  }, []);

  const upsertProduct = useCallback((row: MockProductRow) => {
    setProducts((prev) => {
      const idx = prev.findIndex((p) => p.id === row.id);
      if (idx === -1) return [row, ...prev];
      const next = [...prev];
      next[idx] = row;
      return next;
    });
  }, []);

  const addCapture = useCallback((photoDataUrl: string) => {
    const id = `cap-${crypto.randomUUID().slice(0, 8)}`;
    const draft: CaptureDraft = {
      id,
      photoDataUrl,
      hasAudio: false,
      audioLocked: false,
      aiStatus: "running",
      name: "",
      priceLabel: "",
      categoryId: null,
    };
    setCaptureSeries((prev) => [...prev, draft]);
    setSelectedCaptureId(id);
    window.setTimeout(() => {
      setCaptureSeries((prev) =>
        prev.map((row) =>
          row.id === id
            ? {
                ...row,
                aiStatus: Math.random() > 0.25 ? "done" : "manual",
                name: row.name || `Peça ${prev.findIndex((x) => x.id === id) + 1}`,
                priceLabel: row.priceLabel || "R$ 29,90",
                categoryId: row.categoryId ?? INITIAL_CATEGORIES[0]?.id ?? null,
              }
            : row,
        ),
      );
    }, 800);
    return id;
  }, []);

  const setCaptureAudio = useCallback((id: string, locked = false) => {
    setCaptureSeries((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, hasAudio: true, audioLocked: locked } : c,
      ),
    );
  }, []);

  const updateCapture = useCallback(
    (id: string, patch: Partial<CaptureDraft>) => {
      setCaptureSeries((prev) =>
        prev.map((c) => (c.id === id ? { ...c, ...patch } : c)),
      );
    },
    [],
  );

  const removeCapture = useCallback((id: string) => {
    setCaptureSeries((prev) => prev.filter((c) => c.id !== id));
    setSelectedCaptureId((cur) => (cur === id ? null : cur));
  }, []);

  const resetSeries = useCallback(() => {
    setCaptureSeries([]);
    setSelectedCaptureId(null);
    setCadastroTab("captura");
  }, []);

  const value = useMemo(
    () => ({
      screen,
      setScreen,
      orders,
      togglePacked,
      filter,
      setFilter,
      selectedOrderId,
      setSelectedOrderId,
      notifOpen,
      setNotifOpen,
      notifications,
      dismissNotif,
      clearAllNotifs,
      categories,
      addCategory,
      products,
      upsertProduct,
      captureSeries,
      selectedCaptureId,
      setSelectedCaptureId,
      cadastroTab,
      setCadastroTab,
      addCapture,
      setCaptureAudio,
      updateCapture,
      removeCapture,
      resetSeries,
    }),
    [
      screen,
      orders,
      togglePacked,
      filter,
      selectedOrderId,
      notifOpen,
      notifications,
      dismissNotif,
      clearAllNotifs,
      categories,
      addCategory,
      products,
      upsertProduct,
      captureSeries,
      selectedCaptureId,
      cadastroTab,
      addCapture,
      setCaptureAudio,
      updateCapture,
      removeCapture,
      resetSeries,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePrototypeState(): PrototypeState {
  const ctx = useContext(Ctx);
  if (!ctx) {
    throw new Error("usePrototypeState outside provider");
  }
  return ctx;
}
