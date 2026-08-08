"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  LayoutGrid,
  Package,
  Camera,
  ChartColumn,
  Menu,
  X,
  LogOut,
  Settings,
  Truck,
  Store,
  MessageCircle,
} from "lucide-react";

import { BrandEmptyState, BrandLogo } from "@/components/shared/BrandEmptyState";
import { CadastroRapidoScreen } from "./CadastroRapidoScreen";
import { DashboardScreen } from "./DashboardScreen";
import { NotificationsDrawer, NotifBell } from "./NotificationsDrawer";
import { ProdutosScreen } from "./ProdutosScreen";
import { protoToast } from "./proto-toast";
import {
  PieceCard,
  SeparacaoFilters,
  filterOrders,
  useFilteredPieces,
  usePagedOrderItems,
} from "./separacao-shared";
import {
  formatOrderStatus,
  formatPurchaseWhen,
  type MockOrder,
  type ScreenId,
} from "./mock-data";
import { usePrototypeState } from "./prototype-state";

function orderAllPacked(order: MockOrder) {
  return (
    order.items.length > 0 && order.items.every((i) => Boolean(i.packedAt))
  );
}

function runNextAction(
  order: MockOrder,
  kind: "motoboy" | "envio" | "retirada" | "whatsapp",
) {
  switch (kind) {
    case "motoboy":
      protoToast.success(
        "WhatsApp motoboy (mock)",
        "Número da frota — configurar depois",
      );
      break;
    case "envio":
      protoToast.success("Marcado para envio (mock)");
      break;
    case "retirada":
      protoToast.success("Pronto para retirada (mock)");
      break;
    case "whatsapp":
      protoToast.success(
        "WhatsApp cliente (mock)",
        order.customerPhone
          ? `wa.me/55${order.customerPhone}`
          : "Sem telefone no pedido",
      );
      break;
  }
}

/** Desktop: botões com label. Mobile card: só ícones empilhados. */
function NextActions({
  order,
  layout,
}: {
  order: MockOrder;
  layout: "toolbar" | "icons";
}) {
  if (!orderAllPacked(order)) return null;

  if (layout === "icons") {
    const iconBtn =
      "flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl shadow-sm";
    return (
      <div
        className="absolute right-2 top-2 z-10 flex flex-col gap-1.5 lg:hidden"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        {order.urgentDelivery ? (
          <button
            type="button"
            title="WhatsApp motoboy"
            aria-label="WhatsApp motoboy"
            className={`${iconBtn} bg-[var(--brand-pink)] text-white`}
            onClick={() => runNextAction(order, "motoboy")}
          >
            <MessageCircle className="size-4" />
          </button>
        ) : (
          <>
            {order.fulfillment === "delivery" ? (
              <button
                type="button"
                title="Envio"
                aria-label="Envio"
                className={`${iconBtn} bg-[var(--brand-blue)] text-white`}
                onClick={() => runNextAction(order, "envio")}
              >
                <Truck className="size-4" />
              </button>
            ) : (
              <button
                type="button"
                title="Retirada"
                aria-label="Retirada"
                className={`${iconBtn} bg-[var(--brand-green)] text-white`}
                onClick={() => runNextAction(order, "retirada")}
              >
                <Store className="size-4" />
              </button>
            )}
            <button
              type="button"
              title="WhatsApp cliente"
              aria-label="WhatsApp cliente"
              className={`${iconBtn} border border-[#25D366]/40 bg-[#25D366]/15 text-[#128C7E]`}
              onClick={() => runNextAction(order, "whatsapp")}
            >
              <MessageCircle className="size-4" />
            </button>
          </>
        )}
      </div>
    );
  }

  const barBtn =
    "inline-flex h-11 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-2xl px-4 text-sm font-semibold";

  return (
    <div className="hidden shrink-0 items-center gap-2 lg:flex">
      {order.urgentDelivery ? (
        <button
          type="button"
          className={`${barBtn} bg-[var(--brand-pink)] text-white`}
          onClick={() => runNextAction(order, "motoboy")}
        >
          <MessageCircle className="size-4" />
          WhatsApp motoboy
        </button>
      ) : (
        <>
          {order.fulfillment === "delivery" ? (
            <button
              type="button"
              className={`${barBtn} bg-[var(--brand-blue)] text-white`}
              onClick={() => runNextAction(order, "envio")}
            >
              <Truck className="size-4" />
              Envio
            </button>
          ) : (
            <button
              type="button"
              className={`${barBtn} bg-[var(--brand-green)] text-white`}
              onClick={() => runNextAction(order, "retirada")}
            >
              <Store className="size-4" />
              Retirada
            </button>
          )}
          <button
            type="button"
            className={`${barBtn} border border-[#25D366]/40 bg-[#25D366]/10 text-[#128C7E]`}
            onClick={() => runNextAction(order, "whatsapp")}
          >
            <MessageCircle className="size-4" />
            WhatsApp
          </button>
        </>
      )}
    </div>
  );
}

const PRIMARY_NAV: { id: ScreenId; label: string; icon: typeof Package }[] = [
  { id: "separacao", label: "Separação", icon: LayoutGrid },
  { id: "cadastro", label: "Em massa", icon: Camera },
  { id: "produtos", label: "Produtos", icon: Package },
  { id: "painel", label: "Painel", icon: ChartColumn },
];

const SECONDARY_NAV = [
  { label: "Banners", icon: Package },
  { label: "POS", icon: Package },
  { label: "Override", icon: Package },
] as const;

const CANVAS = "bg-[#eceff3]";

function useMenu() {
  const [open, setOpen] = useState(false);
  return { open, setOpen };
}

function HamburgerMenu({
  open,
  setOpen,
}: {
  open: boolean;
  setOpen: (v: boolean) => void;
}) {
  const { screen, setScreen } = usePrototypeState();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const close = () => setOpen(false);

  const panel =
    open && mounted
      ? createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            className="fixed inset-0 z-[200] flex h-[100dvh] w-screen flex-col bg-[#1B6BB5] text-white md:hidden"
          >
            <div className="flex shrink-0 items-center justify-between border-b border-white/15 px-5 py-4">
              <div>
                <BrandLogo className="h-9 brightness-0 invert" />
                <p className="mt-1 text-sm text-white/70">Admin</p>
              </div>
              <button
                type="button"
                className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-2xl bg-white/15"
                onClick={close}
                aria-label="Fechar"
              >
                <X className="size-5" />
              </button>
            </div>
            {/* Espelha a sidebar: primary (= bottom bar) · secondary · conta */}
            <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto p-4">
              {PRIMARY_NAV.map((item) => {
                const Icon = item.icon;
                const active = screen === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`flex h-11 shrink-0 cursor-pointer items-center gap-3 rounded-2xl px-3 text-sm font-medium ${
                      active
                        ? "bg-white text-[#1B6BB5]"
                        : "text-white hover:bg-white/15"
                    }`}
                    onClick={() => {
                      setScreen(item.id);
                      close();
                    }}
                  >
                    <Icon className="size-5 shrink-0" />
                    {item.label}
                  </button>
                );
              })}
              <div className="my-2 border-t border-white/15" />
              <SecondaryNavList
                tone="menu"
                onNavigate={close}
              />
            </nav>
            <div className="shrink-0 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <SidebarAccountFooter tone="menu" onNavigate={close} />
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-2xl bg-white text-foreground shadow-sm ring-1 ring-black/8"
        aria-label="Menu"
      >
        <Menu className="size-5" />
      </button>
      {panel}
    </div>
  );
}

/** Desktop sidebar footer: avatar + settings · sair */
function SidebarAccountFooter({
  tone = "light",
  onNavigate,
}: {
  tone?: "light" | "rail" | "menu";
  onNavigate?: () => void;
}) {
  const dark = tone === "rail" || tone === "menu";
  const collapse = tone === "rail";
  return (
    <div
      className={`mt-auto shrink-0 space-y-1 border-t pt-3 ${
        dark ? "border-white/15 px-2" : "border-border px-1"
      }`}
    >
      <div className={`flex items-center gap-2 ${dark ? "px-1" : ""}`}>
        <button
          type="button"
          title="Perfil"
          onClick={() => {
            protoToast.message("Perfil", "Mock");
            onNavigate?.();
          }}
          className={`flex min-w-0 flex-1 cursor-pointer items-center gap-2 overflow-hidden rounded-2xl p-1.5 ${
            dark ? "hover:bg-white/15" : "hover:bg-zinc-100"
          }`}
        >
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
              dark
                ? "bg-white/20 text-white"
                : "bg-[var(--brand-blue)] text-white"
            }`}
          >
            RP
          </span>
          <span
            className={`min-w-0 ${
              collapse
                ? "translate-x-2 whitespace-nowrap opacity-0 transition-all duration-300 group-hover/rail:translate-x-0 group-hover/rail:opacity-100"
                : ""
            }`}
          >
            <p
              className={`truncate text-sm font-semibold ${dark ? "text-white" : "text-foreground"}`}
            >
              Admin
            </p>
            <p
              className={`truncate text-[11px] ${dark ? "text-white/70" : "text-muted-foreground"}`}
            >
              loja@repeti
            </p>
          </span>
        </button>
        <button
          type="button"
          title="Configurações"
          onClick={() => {
            protoToast.message("Configurações", "Mock");
            onNavigate?.();
          }}
          className={`flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl ${
            dark
              ? "text-white hover:bg-white/15"
              : "text-muted-foreground hover:bg-zinc-100"
          }`}
        >
          <Settings className="size-5" />
        </button>
      </div>
      <button
        type="button"
        title="Sair"
        onClick={() => {
          protoToast.success("Sessão encerrada (mock)");
          onNavigate?.();
        }}
        className={`flex h-11 w-full cursor-pointer items-center gap-3 overflow-hidden rounded-2xl px-3 text-sm font-semibold ${
          dark
            ? "text-white/90 hover:bg-white/15"
            : "text-[var(--brand-pink)] hover:bg-[var(--brand-pink)]/10"
        }`}
      >
        <LogOut className="size-5 shrink-0" />
        <span
          className={
            collapse
              ? "translate-x-2 whitespace-nowrap opacity-0 transition-all duration-300 group-hover/rail:translate-x-0 group-hover/rail:opacity-100"
              : ""
          }
        >
          Sair
        </span>
      </button>
    </div>
  );
}

function SecondaryNavList({
  tone = "light",
  onNavigate,
}: {
  tone?: "light" | "rail" | "pink" | "menu";
  onNavigate?: () => void;
}) {
  return (
    <>
      {SECONDARY_NAV.map((item) => {
        const Icon = item.icon;
        const dark = tone === "rail" || tone === "menu";
        const collapse = tone === "rail";
        return (
          <button
            key={item.label}
            type="button"
            title={item.label}
            onClick={() => {
              protoToast.message(item.label, "Mock");
              onNavigate?.();
            }}
            className={
              dark
                ? "flex h-11 cursor-pointer items-center gap-3 overflow-hidden rounded-2xl px-3 text-sm font-medium text-white/85 hover:bg-white/15"
                : tone === "pink"
                  ? "flex h-11 cursor-pointer items-center gap-3 rounded-2xl px-3 text-sm font-medium text-muted-foreground hover:bg-zinc-100"
                  : "flex h-11 cursor-pointer items-center gap-3 rounded-2xl px-3 text-sm font-medium text-muted-foreground hover:bg-zinc-100"
            }
          >
            <Icon className="size-5 shrink-0" />
            <span
              className={
                collapse
                  ? "translate-x-2 whitespace-nowrap opacity-0 transition-all duration-300 group-hover/rail:translate-x-0 group-hover/rail:opacity-100"
                  : ""
              }
            >
              {item.label}
            </span>
          </button>
        );
      })}
    </>
  );
}

function BottomBar() {
  const { screen, setScreen } = usePrototypeState();
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-black/5 bg-white pb-[env(safe-area-inset-bottom)] md:hidden"
      aria-label="Admin mobile"
    >
      <ul className="grid grid-cols-4">
        {PRIMARY_NAV.map((item) => {
          const Icon = item.icon;
          const active = screen === item.id;
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => setScreen(item.id)}
                className={`flex w-full cursor-pointer flex-col items-center gap-1 py-2.5 text-[11px] font-medium ${
                  active
                    ? "text-[var(--brand-green)]"
                    : "text-muted-foreground"
                }`}
              >
                <Icon className="size-6" />
                {item.label}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function TopUtility({
  subtitle,
  menu,
}: {
  subtitle: string;
  menu: ReturnType<typeof useMenu>;
}) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-black/5 bg-white/90 px-4 backdrop-blur-sm sm:px-6">
      <p className="truncate text-sm font-medium text-muted-foreground">
        {subtitle}
      </p>
      <div className="flex items-center gap-2">
        <NotifBell />
        <HamburgerMenu open={menu.open} setOpen={menu.setOpen} />
      </div>
    </header>
  );
}

function MainScreens({ hub }: { hub: "grade" | "split" }) {
  const { screen } = usePrototypeState();
  return (
    <>
      <div className={screen === "separacao" ? "block" : "hidden"}>
        {hub === "split" ? <SplitHub /> : <GradeHub />}
      </div>
      <div className={screen === "cadastro" ? "block" : "hidden"}>
        <CadastroRapidoScreen />
      </div>
      <div className={screen === "produtos" ? "block" : "hidden"}>
        <ProdutosScreen />
      </div>
      <div className={screen === "painel" ? "block" : "hidden"}>
        <DashboardScreen />
      </div>
    </>
  );
}

function GradeHub() {
  const { togglePacked, filter } = usePrototypeState();
  const pieces = useFilteredPieces();
  const [page, setPage] = useState(0);
  const pageSize = 6;
  const pageCount = Math.max(1, Math.ceil(pieces.length / pageSize));
  const pageItems = pieces.slice(page * pageSize, page * pageSize + pageSize);

  useEffect(() => {
    setPage(0);
  }, [filter]);

  return (
    <div className="space-y-4 pb-28">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Separação
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Grade · max 6/página · hold só em Produtos
        </p>
      </header>
      <SeparacaoFilters />
      <p className="text-sm text-muted-foreground">
        {pieces.length} peça(s)
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-3">
        {pageItems.map((p) => (
          <PieceCard
            key={p.id}
            piece={p}
            onCheck={
              p.orderId
                ? () => {
                    togglePacked(p.orderId!, p.id);
                    protoToast.message("Check de separação atualizado");
                  }
                : undefined
            }
          />
        ))}
      </div>
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          disabled={page <= 0}
          onClick={() => setPage((p) => p - 1)}
          className="h-11 cursor-pointer rounded-2xl bg-white px-4 text-sm font-medium shadow-sm ring-1 ring-black/5 disabled:opacity-40"
        >
          Anterior
        </button>
        <p className="text-sm text-muted-foreground">
          Página {page + 1} / {pageCount} · {pieces.length} total
        </p>
        <button
          type="button"
          disabled={page >= pageCount - 1}
          onClick={() => setPage((p) => p + 1)}
          className="h-11 cursor-pointer rounded-2xl bg-white px-4 text-sm font-medium shadow-sm ring-1 ring-black/5 disabled:opacity-40"
        >
          Próxima
        </button>
      </div>
    </div>
  );
}

function SplitHub() {
  const {
    orders,
    selectedOrderId,
    setSelectedOrderId,
    togglePacked,
    filter,
  } = usePrototypeState();
  const [query, setQuery] = useState("");
  const filtered = filterOrders(orders, filter, query);
  const selectedId =
    filtered.find((o) => o.id === selectedOrderId)?.id ??
    filtered[0]?.id ??
    null;
  const { order, items, page, setPage, pageCount, total } =
    usePagedOrderItems(selectedId);

  useEffect(() => {
    setPage(0);
  }, [selectedId, setPage]);

  useEffect(() => {
    if (selectedOrderId && !filtered.some((o) => o.id === selectedOrderId)) {
      setSelectedOrderId(filtered[0]?.id ?? null);
    }
  }, [filtered, selectedOrderId, setSelectedOrderId]);

  return (
    <div className="space-y-4 pb-28">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Separação
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Chips filtram clientes · busca por cliente ou peça
        </p>
      </header>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar cliente ou produto…"
        className="h-14 w-full rounded-2xl border border-black/10 bg-white px-4 text-base shadow-sm"
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 flex-1">
          <SeparacaoFilters />
        </div>
        {order ? <NextActions order={order} layout="toolbar" /> : null}
      </div>

      <p className="text-sm text-muted-foreground">
        {filtered.length} cliente(s) / pedido(s)
      </p>

      <div className="grid gap-4 lg:grid-cols-[15rem_1fr]">
        <ul className="flex gap-2 overflow-x-auto pb-1 lg:block lg:max-h-[70vh] lg:space-y-2 lg:overflow-y-auto lg:pb-0">
          {filtered.map((o) => {
            const active = o.id === order?.id;
            const packed = orderAllPacked(o);
            return (
              <li key={o.id} className="shrink-0">
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedOrderId(o.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedOrderId(o.id);
                    }
                  }}
                  className={`relative flex h-40 w-60 cursor-pointer flex-col overflow-hidden rounded-2xl border p-3 text-left transition outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-blue)] lg:h-40 lg:w-full ${
                    packed ? "pr-12 lg:pr-3" : ""
                  } ${
                    active
                      ? "border-transparent bg-[var(--brand-green)] text-white shadow-md"
                      : "border-black/5 bg-white shadow-sm"
                  }`}
                >
                  <NextActions order={o} layout="icons" />
                  <p className="truncate text-base font-semibold">
                    {o.customerName}
                  </p>
                  <p
                    className={`mt-1 truncate text-sm ${active ? "text-white/85" : "text-muted-foreground"}`}
                  >
                    {formatPurchaseWhen(o.purchasedAt)}
                  </p>
                  <p
                    className={`truncate text-xs ${active ? "text-white/70" : "text-muted-foreground/70"}`}
                  >
                    {o.code}
                  </p>
                  <p
                    className={`mt-1 truncate text-xs font-medium ${active ? "text-white/90" : "text-foreground/80"}`}
                  >
                    {formatOrderStatus(o.status)}
                  </p>
                  {o.urgentDelivery ? (
                    <span
                      className={`mt-auto inline-block w-fit rounded-full px-2 py-0.5 text-[11px] font-bold ${
                        active
                          ? "bg-white text-[var(--brand-pink)]"
                          : "bg-[var(--brand-pink)] text-white"
                      }`}
                    >
                      ENTREGA URGENTE
                    </span>
                  ) : (
                    <span className="mt-auto" />
                  )}
                  <p
                    className={`mt-1 text-xs ${active ? "text-white/80" : "text-muted-foreground"}`}
                  >
                    {o.items.filter((i) => i.packedAt).length}/{o.items.length}{" "}
                    checadas
                    {packed ? " · pronto" : ""}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>

        {order ? (
          <div>
            <p className="mb-3 text-sm text-muted-foreground">
              {formatOrderStatus(order.status)} · {total} peça(s)
              {order.fulfillment === "pickup" ? " · Retirada" : " · Entrega"}
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {items.map((it) => (
                <PieceCard
                  key={it.id}
                  piece={{
                    id: it.id,
                    name: it.name,
                    image: it.image,
                    priceCents: it.priceCents,
                    badge:
                      order.status === "paid" ? "a_separar" : "em_separacao",
                    orderId: order.id,
                    purchasedAt: order.purchasedAt,
                    urgent: order.urgentDelivery,
                    packedAt: it.packedAt,
                  }}
                  onCheck={() => {
                    togglePacked(order.id, it.id);
                    protoToast.message("Check de separação atualizado");
                  }}
                />
              ))}
            </div>

            <div className="mt-4 flex items-center justify-between gap-3">
              <button
                type="button"
                disabled={page <= 0}
                onClick={() => setPage((p) => p - 1)}
                className="h-11 cursor-pointer rounded-2xl bg-white px-4 text-sm font-medium shadow-sm ring-1 ring-black/5 disabled:opacity-40"
              >
                Anterior
              </button>
              <p className="text-sm text-muted-foreground">
                Página {page + 1} / {pageCount} · {total} total
              </p>
              <button
                type="button"
                disabled={page >= pageCount - 1}
                onClick={() => setPage((p) => p + 1)}
                className="h-11 cursor-pointer rounded-2xl bg-white px-4 text-sm font-medium shadow-sm ring-1 ring-black/5 disabled:opacity-40"
              >
                Próxima
              </button>
            </div>
          </div>
        ) : (
          <BrandEmptyState
            title="Nenhum cliente neste filtro"
            description="Ajuste a busca ou os chips para ver pedidos a separar."
            className="rounded-2xl border border-dashed border-black/10 bg-white"
          />
        )}
      </div>
    </div>
  );
}

/** A — sidebar + grade (referência) */
export function VariantA() {
  const { screen, setScreen } = usePrototypeState();
  const menu = useMenu();

  return (
    <div className={`min-h-screen font-sans antialiased ${CANVAS}`}>
      <div className="mx-auto flex min-h-screen max-w-7xl">
        <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-black/5 bg-white p-4 md:flex">
          <div className="mb-6 px-2 pt-1">
            <BrandLogo className="h-11" />
            <p className="mt-1 text-xs text-muted-foreground">Admin · A</p>
          </div>
          <nav className="flex flex-1 flex-col gap-1.5 overflow-y-auto">
            {PRIMARY_NAV.map((item) => {
              const Icon = item.icon;
              const active = screen === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setScreen(item.id)}
                  className={`flex h-12 cursor-pointer items-center gap-3 rounded-2xl px-3 text-sm font-medium ${
                    active
                      ? "bg-[var(--brand-green)] text-white"
                      : "text-muted-foreground hover:bg-zinc-100"
                  }`}
                >
                  <Icon className="size-5" />
                  {item.label}
                </button>
              );
            })}
            <div className="my-2 border-t border-border" />
            <SecondaryNavList />
          </nav>
          <SidebarAccountFooter />
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <TopUtility subtitle="Ops clássico · grade" menu={menu} />
          <main className="flex-1 px-4 py-5 sm:px-6">
            <MainScreens hub="grade" />
          </main>
        </div>
      </div>
      <BottomBar />
      <NotificationsDrawer />
    </div>
  );
}

/** B — split (referência HITL “perfeito”) */
export function VariantB() {
  const { screen, setScreen, orders, selectedOrderId } = usePrototypeState();
  const menu = useMenu();
  const selected = orders.find((o) => o.id === selectedOrderId);

  return (
    <div className={`min-h-screen font-sans antialiased ${CANVAS}`}>
      <div className="mx-auto flex min-h-screen max-w-7xl">
        <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col border-r border-black/5 bg-white p-3 md:flex">
          <div className="mb-6 px-2">
            <BrandLogo className="h-10" />
            <p className="mt-1 text-xs text-muted-foreground">Ops · B</p>
          </div>
          <nav className="flex flex-1 flex-col gap-1 overflow-y-auto">
            {PRIMARY_NAV.map((item) => {
              const Icon = item.icon;
              const active = screen === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setScreen(item.id)}
                  className={`flex h-12 cursor-pointer items-center gap-3 rounded-2xl px-3 text-sm font-medium ${
                    active
                      ? "bg-[var(--brand-pink)]/15 text-[var(--brand-pink)]"
                      : "text-muted-foreground hover:bg-zinc-100"
                  }`}
                >
                  <Icon className="size-5" />
                  {item.label}
                </button>
              );
            })}
            <div className="my-2 border-t border-border" />
            <SecondaryNavList tone="pink" />
          </nav>
          <SidebarAccountFooter />
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-black/5 bg-white px-4 sm:px-6">
            <div className="min-w-0">
              {selected && screen === "separacao" ? (
                <p className="truncate text-sm text-muted-foreground">
                  Em foco:{" "}
                  <span className="font-semibold text-foreground">
                    {selected.customerName}
                  </span>{" "}
                  · {formatPurchaseWhen(selected.purchasedAt)}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">Pedido em foco</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <NotifBell />
              <HamburgerMenu open={menu.open} setOpen={menu.setOpen} />
            </div>
          </header>
          <main className="flex-1 px-4 py-5 sm:px-6">
            <MainScreens hub="split" />
          </main>
        </div>
      </div>
      <BottomBar />
      <NotificationsDrawer />
    </div>
  );
}

/**
 * C — preferida: rail hover + Separação split (de B) + demais telas.
 */
export function VariantC() {
  const { screen, setScreen } = usePrototypeState();
  const menu = useMenu();

  return (
    <div className={`min-h-screen font-sans antialiased ${CANVAS}`}>
      <div className="flex min-h-screen">
        <aside className="group/rail sticky top-0 z-40 hidden h-screen w-16 hover:w-56 shrink-0 flex-col overflow-hidden border-r border-black/5 bg-[var(--brand-blue)] py-4 text-white transition-[width] duration-300 ease-out md:flex">
          <div className="mb-6 flex h-12 items-center gap-2 overflow-hidden px-3">
            <BrandLogo
              variant="mark"
              className="h-9 w-9 shrink-0 rounded-lg"
            />
            <BrandLogo className="h-8 shrink-0 opacity-0 transition-opacity duration-300 group-hover/rail:opacity-100 brightness-0 invert" />
          </div>
          <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-2">
            {PRIMARY_NAV.map((item) => {
              const Icon = item.icon;
              const active = screen === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  title={item.label}
                  onClick={() => setScreen(item.id)}
                  className={`flex h-12 cursor-pointer items-center gap-3 overflow-hidden rounded-2xl px-3 text-sm font-medium transition-colors ${
                    active
                      ? "bg-white text-[var(--brand-blue)]"
                      : "hover:bg-white/15"
                  }`}
                >
                  <Icon className="size-5 shrink-0" />
                  <span className="translate-x-2 whitespace-nowrap opacity-0 transition-all duration-300 group-hover/rail:translate-x-0 group-hover/rail:opacity-100">
                    {item.label}
                  </span>
                </button>
              );
            })}
            <div className="my-2 border-t border-white/15" />
            <SecondaryNavList tone="rail" />
          </nav>
          <SidebarAccountFooter tone="rail" />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <TopUtility
            subtitle="C · rail + separação split"
            menu={menu}
          />
          <main className="flex-1 px-4 py-5 sm:px-6">
            <MainScreens hub="split" />
          </main>
        </div>
      </div>
      <BottomBar />
      <NotificationsDrawer />
    </div>
  );
}
