"use client";

import Image from "next/image";
import { useState, type ComponentType, type SVGProps } from "react";
import {
  Baby,
  CloudRain,
  Footprints,
  Gem,
  Heart,
  HeartHandshake,
  House,
  LayoutGrid,
  MapPin,
  Menu,
  MessageCircle,
  Minus,
  Percent,
  Plus,
  Search,
  Shirt,
  ShoppingBag,
  Trash2,
  User,
  X,
} from "lucide-react";
import type { ScreenId } from "../mock-data";
import {
  C,
  MOCK_AGES,
  MOCK_AI_DRAFT,
  MOCK_FAQ,
  MOCK_NAV_CATEGORIES,
  MOCK_ORDER,
  MOCK_PRODUCTS,
  MOCK_QUEUE,
  SCREENS,
} from "../mock-data";

/**
 * PROTOTYPE Variant T rev.3 — TipTop structure + Repeti palette.
 * HITL: Lucide category nav, green→blue→pink, BottomBar, full cart mobile,
 * related Becca, soft Sobre/FAQ + legal + shared footer.
 */

type Props = { screen: ScreenId; onScreen: (id: ScreenId) => void };
type Icon = ComponentType<SVGProps<SVGSVGElement> & { className?: string }>;

const omnes = "font-[family-name:var(--font-omnes)]";
const becca = "font-[family-name:var(--font-becca)]";

const NAV_ICONS: Record<string, Icon> = {
  Shirt,
  Gem,
  Baby,
  Footprints,
  Jacket: CloudRain,
  HeartHandshake,
  Percent,
};

function toneColor(tone: "neutro" | "menino" | "menina" | "promo") {
  if (tone === "menino") return C.blue;
  if (tone === "menina") return C.pink;
  if (tone === "promo") return C.pink;
  return C.green;
}

function ScreenTabs({ screen, onScreen }: Props) {
  return (
    <div className="flex gap-1 overflow-x-auto border-b border-[#E8E8E4] bg-[#FAFAF7] px-3 py-2">
      {SCREENS.map((s) => (
        <button
          key={s.id}
          type="button"
          onClick={() => onScreen(s.id)}
          className={`${omnes} shrink-0 cursor-pointer rounded-full px-3 py-1.5 text-xs font-semibold transition hover:-translate-y-0.5 hover:shadow-md ${
            screen === s.id
              ? "bg-[#8EB038] text-white"
              : "bg-white text-[#1A1A1A]/70 shadow-sm"
          }`}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}

function AccountPopover() {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex cursor-pointer flex-col items-center gap-1 rounded-xl px-2 py-1 text-[#8EB038] transition hover:-translate-y-0.5 hover:shadow-md"
        aria-expanded={open}
      >
        <User className="size-6 md:size-7" strokeWidth={1.75} />
        <span className={`${omnes} hidden text-[11px] font-semibold lg:block`}>Conta</span>
      </button>
      {open && (
        <div className="absolute right-0 top-full z-40 mt-2 w-52 rounded-2xl border border-[#EEE] bg-white p-3 shadow-xl">
          <p className={`${omnes} text-sm font-bold text-[#1A1A1A]`}>Olá, visitante</p>
          <ul className={`${omnes} mt-2 space-y-2 text-sm text-[#333]`}>
            <li>
              <button type="button" className="cursor-pointer hover:text-[#8EB038]">
                Meus pedidos
              </button>
            </li>
            <li>
              <button type="button" className="cursor-pointer hover:text-[#8EB038]">
                Minha Sacolinha
              </button>
            </li>
            <li>
              <button type="button" className="cursor-pointer hover:text-[#8EB038]">
                Entrar / magic link
              </button>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}

function TipTopHeader({
  onScreen,
  onMenu,
}: {
  onScreen: (id: ScreenId) => void;
  onMenu: () => void;
}) {
  return (
    <header className="border-b border-[#E8E8E4] bg-white">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 md:gap-5 md:py-4">
        <button
          type="button"
          className="cursor-pointer md:hidden"
          aria-label="Menu"
          onClick={onMenu}
        >
          <Menu className="size-7 text-[#8EB038]" strokeWidth={1.75} />
        </button>

        <button
          type="button"
          onClick={() => onScreen("home")}
          className="shrink-0 cursor-pointer transition hover:-translate-y-0.5"
        >
          <Image
            src="/brand/logo.png"
            alt="Repeti Petit"
            width={130}
            height={44}
            className="h-10 w-auto object-contain md:h-12"
          />
        </button>

        <label className="relative hidden min-w-0 flex-1 items-center sm:flex">
          <span className="sr-only">Buscar</span>
          <input
            className={`${omnes} h-12 w-full cursor-text rounded-full border-2 border-[#8EB038]/50 bg-white px-5 pr-12 text-base text-[#1A1A1A] placeholder:text-[#1A1A1A]/40 md:h-[3.25rem] md:text-lg`}
            placeholder="O que você procura?"
            readOnly
          />
          <Search className="pointer-events-none absolute right-4 size-5 text-[#8EB038]" />
        </label>

        <div className="ml-auto hidden items-center gap-1 md:flex lg:gap-2">
          <button
            type="button"
            className={`${omnes} flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-[#8EB038] transition hover:-translate-y-0.5 hover:shadow-md`}
          >
            <MapPin className="size-6" strokeWidth={1.75} />
            Nossa loja
          </button>
          <span className="h-8 w-px bg-[#E8E8E4]" />
          <AccountPopover />
          <button
            type="button"
            className="flex cursor-pointer flex-col items-center gap-1 rounded-xl px-2 py-1 text-[#8EB038] transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <Heart className="size-6 md:size-7" strokeWidth={1.75} />
          </button>
          <button
            type="button"
            onClick={() => onScreen("cart")}
            className="relative flex cursor-pointer flex-col items-center gap-1 rounded-xl px-2 py-1 text-[#8EB038] transition hover:-translate-y-0.5 hover:shadow-md"
            aria-label="Sacolinha"
          >
            <ShoppingBag className="size-6 md:size-7" strokeWidth={1.75} />
            <span className={`${omnes} absolute -right-0.5 -top-0.5 flex size-5 items-center justify-center rounded-full bg-[#EB5E5C] text-[11px] font-bold text-white`}>
              3
            </span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => onScreen("cart")}
          className="relative ml-auto flex size-11 cursor-pointer items-center justify-center rounded-full bg-[#F4F8E8] text-[#8EB038] transition hover:-translate-y-0.5 hover:shadow-md md:hidden"
          aria-label="Sacolinha"
        >
          <ShoppingBag className="size-5" />
          <span className={`${omnes} absolute -right-0.5 -top-0.5 flex size-5 items-center justify-center rounded-full bg-[#EB5E5C] text-[11px] font-bold text-white`}>
            3
          </span>
        </button>
      </div>

      {/* Categories: text + Lucide, centered, generous gap — grows from middle to edges */}
      <nav className="mx-auto hidden max-w-6xl justify-center gap-6 overflow-x-auto px-4 pb-4 pt-1 md:flex lg:gap-10">
        {MOCK_NAV_CATEGORIES.map((c) => {
          const Icon = NAV_ICONS[c.icon] ?? Shirt;
          const color = toneColor(c.tone);
          return (
            <button
              key={c.name}
              type="button"
              onClick={() => onScreen("catalog")}
              className="group flex cursor-pointer flex-col items-center gap-1.5 rounded-2xl px-2 py-2 transition hover:-translate-y-1 hover:shadow-lg"
            >
              <Icon
                className="size-7 transition group-hover:scale-110 lg:size-8"
                style={{ color }}
                strokeWidth={1.6}
              />
              <span
                className={`${omnes} text-center text-sm font-semibold lg:text-base`}
                style={{ color }}
              >
                {c.name}
              </span>
            </button>
          );
        })}
      </nav>
    </header>
  );
}

function BottomBar({
  screen,
  onScreen,
  onAccount,
}: {
  screen: ScreenId;
  onScreen: (id: ScreenId) => void;
  onAccount: () => void;
}) {
  const items: {
    id: ScreenId | "account";
    label: string;
    Icon: Icon;
    match?: ScreenId[];
  }[] = [
    { id: "home", label: "Home", Icon: House, match: ["home"] },
    { id: "catalog", label: "Catálogo", Icon: LayoutGrid, match: ["catalog", "pdp"] },
    { id: "cart", label: "Sacolinha", Icon: ShoppingBag, match: ["cart", "checkout"] },
    { id: "account", label: "Conta", Icon: User, match: ["sobre"] },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#E8E8E4] bg-white/95 px-2 pb-[env(safe-area-inset-bottom)] pt-1 backdrop-blur md:hidden">
      <div className="mx-auto flex max-w-lg items-stretch justify-around">
        {items.map((item) => {
          const active = item.match?.includes(screen);
          const Icon = item.Icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() =>
                item.id === "account" ? onAccount() : onScreen(item.id as ScreenId)
              }
              className={`${omnes} relative flex min-w-[4.5rem] cursor-pointer flex-col items-center gap-0.5 rounded-xl px-2 py-2 text-[11px] font-semibold transition hover:-translate-y-0.5 ${
                active ? "text-[#8EB038]" : "text-[#1A1A1A]/55"
              }`}
            >
              <Icon className="size-6" strokeWidth={active ? 2.2 : 1.75} />
              {item.id === "cart" && (
                <span className="absolute right-2 top-1 flex size-4 items-center justify-center rounded-full bg-[#EB5E5C] text-[9px] font-bold text-white">
                  3
                </span>
              )}
              {item.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function Hamburger({
  open,
  onClose,
  onScreen,
}: {
  open: boolean;
  onClose: () => void;
  onScreen: (id: ScreenId) => void;
}) {
  if (!open) return null;
  const go = (id: ScreenId) => {
    onScreen(id);
    onClose();
  };
  return (
    <div className="fixed inset-0 z-50 md:hidden">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Fechar menu"
        onClick={onClose}
      />
      <aside className="absolute left-0 top-0 flex h-full w-[82%] max-w-sm flex-col bg-white p-5 shadow-2xl">
        <div className="mb-6 flex items-center justify-between">
          <Image src="/brand/logo.png" alt="" width={110} height={36} className="h-9 w-auto" />
          <button type="button" onClick={onClose} className="cursor-pointer">
            <X className="size-6 text-[#8EB038]" />
          </button>
        </div>
        <ul className={`${omnes} space-y-1 text-base font-semibold text-[#1A1A1A]`}>
          {(
            [
              ["Catálogo", "catalog"],
              ["Desapegue", "catalog"],
              ["Sobre nós / FAQ", "sobre"],
              ["Privacidade", "privacidade"],
              ["Termos de uso", "termos"],
              ["Admin IA", "admin-ia"],
              ["Fila admin", "admin-fila"],
            ] as const
          ).map(([label, id]) => (
            <li key={label}>
              <button
                type="button"
                onClick={() => go(id)}
                className="w-full cursor-pointer rounded-xl px-3 py-3 text-left transition hover:bg-[#F4F8E8] hover:text-[#8EB038]"
              >
                {label}
              </button>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}

function ProductCard({
  p,
  onClick,
}: {
  p: (typeof MOCK_PRODUCTS)[number];
  onClick: () => void;
}) {
  const accent =
    p.gender === "menina" ? C.pink : p.gender === "menino" ? C.blue : C.green;
  return (
    <button
      type="button"
      onClick={onClick}
      className="group w-full cursor-pointer text-left transition hover:-translate-y-1"
    >
      <article className="overflow-hidden rounded-2xl border border-[#EEE] bg-white shadow-sm transition group-hover:shadow-lg">
        <div className="relative aspect-[3/4] bg-[#F7F7F4]">
          <Image src={p.image} alt={p.title} fill className="object-cover" />
          <span className={`${omnes} absolute left-2 top-2 rounded-full bg-[#EB5E5C] px-2 py-0.5 text-[10px] font-bold text-white`}>
            Única
          </span>
        </div>
        <div className="space-y-1 px-2.5 pb-3 pt-2">
          <p className={`${omnes} text-sm font-semibold tracking-wide`} style={{ color: accent }}>
            {p.sizes.join("  ")}
          </p>
          <p className={`${omnes} line-clamp-2 text-[13px] font-medium leading-snug text-[#333] md:text-sm`}>
            {p.title}
          </p>
          <p className={`${omnes} text-lg font-bold md:text-xl`} style={{ color: C.greenDark }}>
            {p.price}
          </p>
        </div>
      </article>
    </button>
  );
}

function RelatedSection({ onScreen }: { onScreen: (id: ScreenId) => void }) {
  return (
    <section className="mx-auto max-w-6xl px-4 py-8 md:py-10">
      <h2 className={`${becca} mb-5 text-3xl text-[#8EB038] md:text-4xl`}>
        você pode gostar também
      </h2>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-5">
        {MOCK_PRODUCTS.slice(1, 5).map((p) => (
          <ProductCard key={`rel-${p.id}`} p={p} onClick={() => onScreen("pdp")} />
        ))}
      </div>
    </section>
  );
}

function SoftFooter({ onScreen }: { onScreen: (id: ScreenId) => void }) {
  return (
    <footer className="relative mt-8 overflow-hidden bg-[#E8F2FC] text-[#165DA4]">
      <div className="pointer-events-none absolute inset-x-0 -top-6 h-8 bg-white [clip-path:ellipse(55%_100%_at_50%_0%)]" />
      <div className="mx-auto grid max-w-6xl gap-8 px-6 py-12 md:grid-cols-3 md:py-16">
        <div>
          <Image src="/brand/logo.png" alt="Repeti Petit" width={120} height={40} className="h-10 w-auto" />
          <p className={`${omnes} mt-3 text-sm leading-relaxed text-[#165DA4]/80`}>
            Brechó infantil em Foz do Iguaçu. Peça única, Sacolinha sem pressa e
            compra simples.
          </p>
        </div>
        <div>
          <p className={`${becca} text-2xl text-[#EB5E5C]`}>institucional</p>
          <ul className={`${omnes} mt-3 space-y-2 text-sm font-semibold`}>
            <li>
              <button type="button" className="cursor-pointer hover:underline" onClick={() => onScreen("sobre")}>
                Sobre nós / FAQ
              </button>
            </li>
            <li>
              <button type="button" className="cursor-pointer hover:underline" onClick={() => onScreen("privacidade")}>
                Política de privacidade
              </button>
            </li>
            <li>
              <button type="button" className="cursor-pointer hover:underline" onClick={() => onScreen("termos")}>
                Termos de uso
              </button>
            </li>
          </ul>
        </div>
        <div>
          <p className={`${becca} text-2xl text-[#EB5E5C]`}>fale conosco</p>
          <div className="mt-3 flex gap-3">
            <a className="flex size-11 cursor-pointer items-center justify-center rounded-full bg-white text-[#8EB038] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md" href="#" aria-label="Instagram">
              <Heart className="size-5" />
            </a>
            <a className="flex size-11 cursor-pointer items-center justify-center rounded-full bg-white text-[#8EB038] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md" href="#" aria-label="WhatsApp">
              <MessageCircle className="size-5" />
            </a>
          </div>
          <p className={`${omnes} mt-3 text-sm`}>Foz do Iguaçu · PR</p>
        </div>
      </div>
      <p className={`${omnes} border-t border-white/60 py-4 text-center text-xs text-[#165DA4]/70`}>
        © Repeti Petit — protótipo Slice O
      </p>
    </footer>
  );
}

export function VariantT({ screen, onScreen }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const showChrome = !["admin-ia", "admin-fila"].includes(screen);
  const hideBottom = screen === "cart"; // full-screen cart on mobile

  return (
    <div className={`${omnes} min-h-screen bg-white text-[#1A1A1A] ${hideBottom ? "pb-0" : "pb-24"} md:pb-0`}>
      <div className="bg-[#8EB038] px-3 py-1 text-center text-[10px] font-bold text-white">
        PROTOTYPE T rev.3 — TipTop chrome · verde/azul/rosa · BottomBar · legal soft
      </div>

      {showChrome && (
        <TipTopHeader onScreen={onScreen} onMenu={() => setMenuOpen(true)} />
      )}
      <ScreenTabs screen={screen} onScreen={onScreen} />
      <Hamburger open={menuOpen} onClose={() => setMenuOpen(false)} onScreen={onScreen} />

      {screen === "home" && (
        <div>
          <section className="relative mx-auto max-w-6xl overflow-hidden md:px-4 md:pt-4">
            <div className="relative aspect-[16/9] md:aspect-[21/8] md:rounded-[2rem]">
              <Image
                src="/repeti-petit-demo-assets/banner-01.webp"
                alt=""
                fill
                className="object-cover md:rounded-[2rem]"
                priority
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/25 md:rounded-[2rem]">
                <p className={`${becca} text-center text-4xl leading-none text-white drop-shadow md:text-6xl`}>
                  peça única, história nova
                </p>
                <button
                  type="button"
                  onClick={() => onScreen("catalog")}
                  className={`${omnes} mt-4 cursor-pointer rounded-full bg-[#8EB038] px-8 py-3 text-base font-semibold text-white shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl md:text-lg`}
                >
                  Ver catálogo
                </button>
              </div>
            </div>
          </section>

          <section className="mx-auto max-w-6xl px-4 py-8 md:py-10">
            <h2 className={`${becca} text-center text-3xl text-[#8EB038] md:text-4xl`}>
              filtre por idade
            </h2>
            <div className="mt-3 flex justify-center gap-8">
              <button type="button" className={`${omnes} cursor-pointer border-b-2 border-[#EB5E5C] pb-0.5 text-base font-semibold text-[#EB5E5C]`}>
                Meninas
              </button>
              <button type="button" className={`${omnes} cursor-pointer text-base font-semibold text-[#165DA4]`}>
                Meninos
              </button>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
              {MOCK_AGES.map((age) => (
                <button
                  key={age}
                  type="button"
                  onClick={() => onScreen("catalog")}
                  className={`${becca} cursor-pointer rounded-2xl bg-[#8EB038] px-3 py-4 text-center text-xl leading-tight text-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg md:rounded-3xl md:py-5 md:text-2xl`}
                >
                  {age}
                </button>
              ))}
            </div>
          </section>

          <section className="mx-auto max-w-6xl px-4 pb-6">
            <h2 className={`${becca} mb-5 text-3xl text-[#8EB038] md:text-4xl`}>
              novidades da semana!
            </h2>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-5 lg:grid-cols-4">
              {MOCK_PRODUCTS.map((p) => (
                <ProductCard key={p.id} p={p} onClick={() => onScreen("pdp")} />
              ))}
            </div>
          </section>
        </div>
      )}

      {screen === "catalog" && (
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 md:grid-cols-[220px_1fr] md:gap-8 md:py-8">
          <aside className="hidden space-y-6 md:block">
            <div>
              <h3 className={`${omnes} text-lg font-bold text-[#8EB038]`}>Tamanho</h3>
              <ul className={`${omnes} mt-2 space-y-1.5 text-sm`}>
                {["2A", "4A", "6A", "8A"].map((s) => (
                  <li key={s}>
                    <label className="flex cursor-pointer items-center gap-2">
                      <input type="checkbox" className="size-4 accent-[#8EB038]" />
                      {s}
                    </label>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className={`${omnes} text-lg font-bold text-[#8EB038]`}>Gênero</h3>
              <ul className={`${omnes} mt-2 space-y-1.5 text-sm`}>
                <li className="text-[#EB5E5C]">Menina</li>
                <li className="text-[#165DA4]">Menino</li>
                <li className="text-[#8EB038]">Unissex</li>
              </ul>
            </div>
          </aside>
          <div>
            <p className={`${omnes} mb-4 text-sm font-semibold text-[#8EB038]`}>
              {MOCK_PRODUCTS.length} itens encontrados
            </p>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-5">
              {MOCK_PRODUCTS.map((p) => (
                <ProductCard key={p.id} p={p} onClick={() => onScreen("pdp")} />
              ))}
            </div>
          </div>
        </div>
      )}

      {screen === "pdp" && (
        <>
          <div className="mx-auto max-w-6xl px-4 py-6 md:grid md:grid-cols-2 md:gap-10 md:py-10">
            <div className="relative min-h-[320px] overflow-hidden rounded-3xl bg-[#F7F7F4] md:min-h-[480px]">
              <Image src={MOCK_PRODUCTS[0].image} alt="" fill className="object-cover" priority />
            </div>
            <div className="mt-6 space-y-5 rounded-3xl border border-[#EEE] bg-white p-5 shadow-sm md:mt-0 md:p-8">
              <p className={`${omnes} text-xs font-bold uppercase tracking-widest text-[#8EB038]`}>
                Peça única · Seminovo
              </p>
              <h1 className={`${omnes} text-2xl font-bold md:text-3xl`}>{MOCK_PRODUCTS[0].title}</h1>
              <p className={`${omnes} text-3xl font-bold text-[#8EB038] md:text-4xl`}>
                {MOCK_PRODUCTS[0].price}
              </p>
              <button
                type="button"
                onClick={() => onScreen("cart")}
                className={`${omnes} w-full cursor-pointer rounded-full bg-[#8EB038] py-4 text-base font-bold text-white shadow-md transition hover:-translate-y-0.5 hover:shadow-lg md:text-lg`}
              >
                Adicionar à Sacolinha
              </button>
              <button
                type="button"
                onClick={() => onScreen("checkout")}
                className={`${omnes} w-full cursor-pointer rounded-full border-2 border-[#165DA4] py-3.5 text-base font-bold text-[#165DA4] transition hover:-translate-y-0.5 hover:shadow-md`}
              >
                Comprar agora
              </button>
            </div>
          </div>
          <RelatedSection onScreen={onScreen} />
        </>
      )}

      {screen === "cart" && (
        <div className="fixed inset-0 z-50 flex flex-col bg-white md:relative md:inset-auto md:z-auto md:ml-auto md:min-h-[70vh] md:max-w-md md:shadow-2xl">
          <div className="flex items-center justify-between border-b border-[#EEE] px-5 py-4">
            <div className="flex items-center gap-2">
              <ShoppingBag className="size-5 text-[#8EB038]" />
              <h1 className={`${omnes} text-xl font-bold text-[#8EB038] md:text-2xl`}>
                Minha sacola
              </h1>
            </div>
            <button type="button" onClick={() => onScreen("pdp")} className="cursor-pointer" aria-label="Fechar">
              <X className="size-6 text-[#8EB038]" />
            </button>
          </div>
          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
            {MOCK_PRODUCTS.slice(0, 3).map((p) => (
              <div key={p.id} className="flex gap-3 border-b border-[#F0F0EC] pb-4">
                <div className="relative size-20 shrink-0 overflow-hidden rounded-2xl">
                  <Image src={p.image} alt="" fill className="object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`${omnes} text-sm font-bold`}>{p.title}</p>
                  <p className={`${omnes} mt-1 text-base font-bold text-[#8EB038]`}>{p.price}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center gap-2 rounded-full border border-[#E5E5E0] px-2 py-1">
                      <Minus className="size-3.5" />
                      <span className="text-sm font-semibold">1</span>
                      <Plus className="size-3.5" />
                    </div>
                    <Trash2 className="size-4 text-[#999]" />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="space-y-3 border-t border-[#EEE] px-5 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            <div className={`${omnes} flex justify-between text-lg font-bold`}>
              <span>Subtotal</span>
              <span className="text-[#8EB038]">R$ 208,00</span>
            </div>
            <button
              type="button"
              onClick={() => onScreen("checkout")}
              className={`${omnes} w-full cursor-pointer rounded-full bg-[#8EB038] py-4 text-base font-bold text-white transition hover:-translate-y-0.5 hover:shadow-lg`}
            >
              FINALIZAR COMPRA
            </button>
            <button
              type="button"
              onClick={() => onScreen("catalog")}
              className={`${omnes} w-full cursor-pointer rounded-full border-2 border-[#8EB038] py-3 text-sm font-bold text-[#8EB038]`}
            >
              Continuar comprando
            </button>
          </div>
        </div>
      )}

      {screen === "checkout" && (
        <>
          <div className="mx-auto grid max-w-5xl gap-6 px-4 py-6 md:grid-cols-[1.2fr_0.9fr] md:gap-8 md:py-10">
            <div className="space-y-5">
              <h1 className={`${omnes} text-2xl font-bold md:text-3xl`}>Checkout</h1>
              <section className="rounded-3xl border border-[#EEE] bg-white p-5 md:p-6">
                <h2 className={`${becca} mb-4 text-2xl text-[#8EB038] md:text-3xl`}>como receber</h2>
                <label className="mb-3 flex cursor-pointer gap-3 rounded-2xl border-2 border-[#8EB038] bg-[#8EB038]/10 p-4 transition hover:shadow-md">
                  <input type="radio" name="ful" defaultChecked className="mt-1 accent-[#8EB038]" />
                  <span>
                    <span className={`${omnes} block text-lg font-bold`}>Sacolinha</span>
                    <span className={`${omnes} text-sm text-[#1A1A1A]/65`}>
                      Guarde na loja — retire quando quiser
                    </span>
                  </span>
                </label>
                <label className="flex cursor-pointer gap-3 rounded-2xl border border-[#E5E5E0] p-4 transition hover:shadow-md">
                  <input type="radio" name="ful" className="mt-1 accent-[#8EB038]" />
                  <span>
                    <span className={`${omnes} block text-lg font-bold`}>Entrega imediata</span>
                    <span className={`${omnes} text-sm text-[#1A1A1A]/65`}>CEP + calcular frete</span>
                  </span>
                </label>
              </section>
              <section className="space-y-3 rounded-3xl border border-[#EEE] p-5">
                {(["Nome completo", "E-mail", "Celular"] as const).map((ph) => (
                  <input
                    key={ph}
                    className={`${omnes} w-full rounded-full border border-[#D9D9D4] px-5 py-3.5 text-base`}
                    placeholder={ph}
                  />
                ))}
              </section>
            </div>
            <aside className="h-fit rounded-3xl border border-[#EEE] bg-white p-5 shadow-sm md:sticky md:top-4">
              <h2 className={`${omnes} text-xl font-bold`}>Resumo</h2>
              <div className={`${omnes} mt-4 flex justify-between text-lg font-bold`}>
                <span>Total</span>
                <span className="text-[#8EB038]">R$ 45,00</span>
              </div>
              <button
                type="button"
                onClick={() => onScreen("pedido")}
                className={`${omnes} mt-5 w-full cursor-pointer rounded-full bg-[#8EB038] py-4 text-base font-bold text-white transition hover:-translate-y-0.5 hover:shadow-lg`}
              >
                Pagar com Mercado Pago
              </button>
            </aside>
          </div>
          <RelatedSection onScreen={onScreen} />
        </>
      )}

      {screen === "pedido" && (
        <div className="mx-auto max-w-lg px-4 py-10 text-center">
          <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-[#8EB038] text-2xl text-white">✓</div>
          <p className={`${becca} mt-4 text-3xl text-[#8EB038] md:text-4xl`}>pagamento confirmado!</p>
          <h1 className={`${omnes} mt-2 text-2xl font-bold`}>{MOCK_ORDER.code}</h1>
          <div className="mt-6 rounded-3xl border border-[#EEE] p-5 text-left">
            <p className={`${omnes} font-bold`}>{MOCK_ORDER.fulfillment}</p>
          </div>
        </div>
      )}

      {screen === "sobre" && (
        <div className="bg-[#E8F2FC]/40">
          <section className="relative overflow-hidden px-6 pb-16 pt-12 md:pt-16">
            <div className="pointer-events-none absolute inset-0 opacity-40 [background-image:radial-gradient(circle,#fff_1px,transparent_1px)] [background-size:18px_18px]" />
            <div className="relative mx-auto max-w-3xl text-center">
              <h1 className={`${becca} text-4xl text-[#EB5E5C] md:text-6xl`}>
                sobre a Repeti Petit
              </h1>
              <p className={`${omnes} mx-auto mt-4 max-w-xl text-base leading-relaxed text-[#165DA4] md:text-lg`}>
                Brechó infantil em Foz do Iguaçu. Peças únicas, compra simples e a
                Sacolinha para retirar no seu tempo.
              </p>
              <button
                type="button"
                onClick={() => onScreen("catalog")}
                className={`${omnes} mt-6 cursor-pointer rounded-full bg-[#8EB038] px-8 py-3 text-base font-bold text-white shadow-md transition hover:-translate-y-0.5`}
              >
                Ver catálogo
              </button>
            </div>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-white [clip-path:ellipse(60%_100%_at_50%_100%)]" />
          </section>

          <section className="bg-white px-6 py-12">
            <h2 className={`${becca} text-center text-3xl text-[#EB5E5C] md:text-4xl`}>
              o melhor para seu petit
            </h2>
            <p className={`${omnes} mt-2 text-center text-sm text-[#999]`}>Veja como funciona</p>
            <div className="mx-auto mt-8 grid max-w-5xl gap-4 md:grid-cols-3">
              {(
                [
                  ["Escolha", "Navegue no catálogo e reserve a peça única.", "bg-[#8EB038]"],
                  ["Pague", "Checkout rápido — Sacolinha ou entrega imediata.", "bg-[#165DA4]"],
                  ["Retire", "Sua Sacolinha espera na loja quando você puder.", "bg-[#EB5E5C]"],
                ] as const
              ).map(([t, d, bg]) => (
                <article key={t} className={`${bg} cursor-default rounded-3xl p-6 text-white shadow-md`}>
                  <h3 className={`${becca} text-3xl`}>{t}</h3>
                  <p className={`${omnes} mt-2 text-sm leading-relaxed opacity-95`}>{d}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="bg-white px-6 pb-16">
            <h2 className={`${becca} text-center text-3xl text-[#EB5E5C] md:text-4xl`}>dúvidas?</h2>
            <div className="mx-auto mt-8 max-w-2xl space-y-3">
              {MOCK_FAQ.map((f) => (
                <details
                  key={f.q}
                  className="group rounded-2xl border border-[#E8E8E4] bg-[#FAFAF7] p-4 open:shadow-md"
                >
                  <summary className={`${omnes} cursor-pointer list-none text-base font-bold text-[#165DA4]`}>
                    {f.q}
                  </summary>
                  <p className={`${omnes} mt-2 text-sm leading-relaxed text-[#333]`}>{f.a}</p>
                </details>
              ))}
            </div>
          </section>
        </div>
      )}

      {screen === "privacidade" && (
        <article className="mx-auto max-w-3xl px-6 py-10 md:py-14">
          <h1 className={`${becca} text-4xl text-[#EB5E5C] md:text-5xl`}>política de privacidade</h1>
          <div className={`${omnes} mt-6 space-y-4 text-sm leading-relaxed text-[#333] md:text-base`}>
            <p>
              A Repeti Petit trata dados pessoais com cuidado (LGPD). Coletamos nome,
              e-mail, telefone e, quando necessário, endereço/CEP para entrega e
              emissão do pedido.
            </p>
            <p>
              Dados de pagamento são processados pelo Mercado Pago — não armazenamos
              número completo de cartão em nossos servidores.
            </p>
            <p>
              Usamos cookies de sessão (hold/Sacolinha) e preferências de recebimento.
              Não vendemos seus dados a terceiros.
            </p>
            <p>
              Para exercer direitos de acesso, correção ou exclusão, fale conosco pelo
              WhatsApp da loja ou e-mail de contato.
            </p>
            <p className="text-xs text-[#999]">
              Texto adaptado ao e-commerce Repeti Petit (referência estrutural TipTop /
              iFraldas — não é cópia do produto lista de chá).
            </p>
          </div>
        </article>
      )}

      {screen === "termos" && (
        <article className="mx-auto max-w-3xl px-6 py-10 md:py-14">
          <h1 className={`${becca} text-4xl text-[#EB5E5C] md:text-5xl`}>termos de uso</h1>
          <div className={`${omnes} mt-6 space-y-4 text-sm leading-relaxed text-[#333] md:text-base`}>
            <p>
              Ao usar o site da Repeti Petit você concorda com estes termos. O catálogo
              exibe peças únicas sujeitas a disponibilidade (Hold Session / venda em loja).
            </p>
            <p>
              Pedidos pagos entram na Sacolinha (retirada) ou seguem para entrega imediata
              conforme escolha no checkout. Prazos e frete são informados antes do pagamento.
            </p>
            <p>
              É vedado uso fraudulento, abuso do sistema de reservas ou qualquer conduta
              ilegal. Podemos cancelar pedidos em caso de inconsistência ou suspeita de fraude.
            </p>
            <p>
              Foro: Comarca de Foz do Iguaçu/PR, leis brasileiras. Dúvidas: WhatsApp da loja.
            </p>
            <p className="text-xs text-[#999]">
              Adaptado para Repeti Petit a partir da estrutura TipTop/iFraldas — conteúdo
              próprio de brechó/e-commerce, não de lista de chá.
            </p>
          </div>
        </article>
      )}

      {screen === "admin-ia" && (
        <div className="mx-auto max-w-lg space-y-4 px-4 py-6">
          <h1 className={`${omnes} text-2xl font-bold`}>Cadastrar com IA</h1>
          <p className={`${omnes} text-sm text-[#666]`}>{MOCK_AI_DRAFT.title}</p>
          <button type="button" className={`${omnes} w-full cursor-pointer rounded-full bg-[#8EB038] py-3 font-bold text-white`}>
            Confirmar + imprimir
          </button>
        </div>
      )}

      {screen === "admin-fila" && (
        <div className="mx-auto max-w-lg space-y-3 px-4 py-6">
          <h1 className={`${omnes} text-2xl font-bold`}>Fila</h1>
          {MOCK_QUEUE.map((o) => (
            <article
              key={o.code}
              className={`cursor-pointer rounded-3xl border p-4 transition hover:-translate-y-0.5 hover:shadow-md ${
                o.type === "entrega_imediata" ? "border-[#EB5E5C]" : "border-[#EEE]"
              }`}
            >
              <p className={`${omnes} font-bold`}>{o.code}</p>
              <p className={`${omnes} text-sm text-[#666]`}>{o.customer}</p>
            </article>
          ))}
        </div>
      )}

      {showChrome && screen !== "cart" && <SoftFooter onScreen={onScreen} />}
      {showChrome && !hideBottom && (
        <BottomBar
          screen={screen}
          onScreen={onScreen}
          onAccount={() => setMenuOpen(true)}
        />
      )}
    </div>
  );
}
