"use client";

import Image from "next/image";
import type { ScreenId } from "../mock-data";
import {
  MOCK_AI_DRAFT,
  MOCK_CATEGORIES,
  MOCK_ORDER,
  MOCK_PRODUCTS,
  MOCK_QUEUE,
  SCREENS,
} from "../mock-data";

/** PROTOTYPE Variant A — Dense commerce (TipTop-like density). */

type Props = { screen: ScreenId; onScreen: (id: ScreenId) => void };

function ScreenTabs({ screen, onScreen }: Props) {
  return (
    <div className="flex gap-1 overflow-x-auto border-b border-[#E5E5E0] bg-white px-2 py-1.5">
      {SCREENS.map((s) => (
        <button
          key={s.id}
          type="button"
          onClick={() => onScreen(s.id)}
          className={`shrink-0 rounded-md px-2.5 py-1 text-[11px] font-semibold ${
            screen === s.id
              ? "bg-[#165DA4] text-white"
              : "text-[#1A1A1A]/70 hover:bg-[#F4F4F0]"
          }`}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}

function CompactHeader() {
  return (
    <header className="flex h-12 items-center justify-between border-b border-[#E5E5E0] bg-white px-3">
      <Image
        src="/brand/logo.png"
        alt="Repeti Petit"
        width={110}
        height={36}
        className="h-8 w-auto object-contain"
      />
      <nav className="hidden gap-4 text-xs font-semibold sm:flex">
        <span>Catálogo</span>
        <span>Desapegue</span>
      </nav>
      <div className="flex size-8 items-center justify-center rounded-full bg-[#F4F4F0] text-xs font-bold">
        1
      </div>
    </header>
  );
}

function ProductTile({
  p,
  dense,
}: {
  p: (typeof MOCK_PRODUCTS)[number];
  dense?: boolean;
}) {
  return (
    <article className="overflow-hidden rounded-lg border border-[#E5E5E0] bg-white">
      <div className={`relative bg-[#F4F4F0] ${dense ? "aspect-[3/4]" : "aspect-square"}`}>
        <Image src={p.image} alt={p.title} fill className="object-cover" />
        <span className="absolute left-1 top-1 rounded bg-[#EB5E5C] px-1.5 py-0.5 text-[9px] font-bold text-white">
          Única
        </span>
      </div>
      <div className="space-y-0.5 p-2">
        <p className="line-clamp-2 text-[11px] font-medium leading-tight">{p.title}</p>
        <p className="text-[10px] text-[#1A1A1A]/55">
          {p.size} · {p.brand}
        </p>
        <p className="text-sm font-bold text-[#165DA4]">{p.price}</p>
      </div>
    </article>
  );
}

export function VariantA({ screen, onScreen }: Props) {
  return (
    <div className="min-h-screen bg-[#FAFAF7] pb-24 font-sans text-[#1A1A1A]">
      <div className="sticky top-0 z-20">
        <div className="bg-[#8EB038] px-3 py-1 text-center text-[10px] font-bold text-white">
          PROTOTYPE A — Dense commerce · TipTop density + cores Repeti
        </div>
        <CompactHeader />
        <ScreenTabs screen={screen} onScreen={onScreen} />
      </div>

      {screen === "home" && (
        <div className="space-y-4">
          <div className="relative aspect-[21/9] w-full bg-[#165DA4]">
            <Image
              src="/repeti-petit-demo-assets/banner-01.webp"
              alt=""
              fill
              className="object-cover opacity-80"
            />
            <div className="absolute inset-0 flex flex-col items-start justify-end p-4 text-white">
              <p className="font-heading text-2xl font-extrabold leading-none">
                Brechó infantil
              </p>
              <p className="mt-1 text-xs opacity-90">Peças únicas · Foz do Iguaçu</p>
              <button
                type="button"
                onClick={() => onScreen("catalog")}
                className="mt-3 rounded-md bg-white px-4 py-2 text-xs font-bold text-[#165DA4]"
              >
                Ver catálogo
              </button>
            </div>
          </div>
          <div className="flex gap-2 overflow-x-auto px-3">
            {MOCK_CATEGORIES.map((c) => (
              <button
                key={c.name}
                type="button"
                className="flex shrink-0 flex-col items-center gap-1"
              >
                <span className="relative size-14 overflow-hidden rounded-full border-2 border-[#165DA4]">
                  <Image src={c.image} alt="" fill className="object-cover" />
                </span>
                <span className="text-[10px] font-semibold">{c.name}</span>
              </button>
            ))}
          </div>
          <section className="px-3">
            <div className="mb-2 flex items-end justify-between">
              <h2 className="text-sm font-bold">Novidades</h2>
              <button
                type="button"
                className="text-[11px] font-semibold text-[#165DA4]"
                onClick={() => onScreen("catalog")}
              >
                Ver tudo
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {MOCK_PRODUCTS.map((p) => (
                <button key={p.id} type="button" onClick={() => onScreen("pdp")}>
                  <ProductTile p={p} dense />
                </button>
              ))}
            </div>
          </section>
        </div>
      )}

      {screen === "catalog" && (
        <div>
          <div className="flex gap-1.5 overflow-x-auto border-b border-[#E5E5E0] bg-white px-3 py-2">
            {["Tamanho", "Gênero", "Marca", "Preço"].map((f) => (
              <span
                key={f}
                className="shrink-0 rounded-full border border-[#E5E5E0] px-3 py-1 text-[11px] font-semibold"
              >
                {f}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2 p-2 sm:grid-cols-4">
            {MOCK_PRODUCTS.map((p) => (
              <button key={p.id} type="button" onClick={() => onScreen("pdp")}>
                <ProductTile p={p} dense />
              </button>
            ))}
          </div>
        </div>
      )}

      {screen === "pdp" && (
        <div className="mx-auto max-w-lg">
          <div className="relative aspect-[4/5] bg-[#F4F4F0]">
            <Image
              src={MOCK_PRODUCTS[0].image}
              alt=""
              fill
              className="object-cover"
            />
          </div>
          <div className="space-y-3 p-4">
            <div className="flex gap-2">
              <span className="rounded bg-[#EB5E5C] px-2 py-0.5 text-[10px] font-bold text-white">
                Peça única
              </span>
              <span className="rounded bg-[#F4F4F0] px-2 py-0.5 text-[10px] font-semibold">
                Seminovo
              </span>
            </div>
            <h1 className="font-heading text-xl font-extrabold leading-tight">
              {MOCK_PRODUCTS[0].title}
            </h1>
            <p className="text-2xl font-bold text-[#165DA4]">{MOCK_PRODUCTS[0].price}</p>
            <dl className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <dt className="text-[#1A1A1A]/55">Tamanho</dt>
                <dd className="font-semibold">4A</dd>
              </div>
              <div>
                <dt className="text-[#1A1A1A]/55">Marca</dt>
                <dd className="font-semibold">Carter&apos;s</dd>
              </div>
            </dl>
            <button
              type="button"
              onClick={() => onScreen("checkout")}
              className="w-full rounded-md bg-[#165DA4] py-3 text-sm font-bold text-white"
            >
              Comprar agora
            </button>
          </div>
        </div>
      )}

      {screen === "checkout" && (
        <div className="mx-auto max-w-md space-y-3 p-3">
          <h1 className="font-heading text-lg font-extrabold">Checkout</h1>
          <section className="rounded-lg border border-[#E5E5E0] bg-white p-3">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[#1A1A1A]/55">
              Recebimento
            </p>
            <label className="mb-2 flex cursor-pointer items-start gap-2 rounded-md border-2 border-[#165DA4] bg-[#165DA4]/5 p-2.5">
              <input type="radio" name="ful" defaultChecked className="mt-0.5" />
              <span>
                <span className="block text-sm font-bold">Sacolinha</span>
                <span className="text-[11px] text-[#1A1A1A]/65">
                  Guarde na loja — retire quando quiser
                </span>
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-2 rounded-md border border-[#E5E5E0] p-2.5">
              <input type="radio" name="ful" className="mt-0.5" />
              <span>
                <span className="block text-sm font-bold">Entrega imediata</span>
                <span className="text-[11px] text-[#1A1A1A]/65">
                  Frete por distância · Calcular antes de pagar
                </span>
              </span>
            </label>
          </section>
          <section className="space-y-2 rounded-lg border border-[#E5E5E0] bg-white p-3">
            <input
              className="w-full rounded-md border border-[#E5E5E0] px-3 py-2 text-sm"
              placeholder="Nome"
              defaultValue="Maria Lima"
            />
            <input
              className="w-full rounded-md border border-[#E5E5E0] px-3 py-2 text-sm"
              placeholder="E-mail"
              defaultValue="maria@email.com"
            />
            <input
              className="w-full rounded-md border border-[#E5E5E0] px-3 py-2 text-sm"
              placeholder="Telefone"
              defaultValue="(45) 99999-0000"
            />
          </section>
          <div className="rounded-lg border border-[#E5E5E0] bg-white p-3 text-sm">
            <div className="flex justify-between font-bold">
              <span>Total</span>
              <span className="text-[#165DA4]">R$ 45,00</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onScreen("pedido")}
            className="w-full rounded-md bg-[#8EB038] py-3.5 text-sm font-bold text-white shadow-sm"
          >
            Pagar com Mercado Pago
          </button>
        </div>
      )}

      {screen === "pedido" && (
        <div className="mx-auto max-w-md space-y-4 p-4">
          <h1 className="font-heading text-xl font-extrabold">
            Pedido {MOCK_ORDER.code}
          </h1>
          <p className="text-sm">
            Status: <strong>{MOCK_ORDER.status}</strong>
          </p>
          <div className="flex justify-between gap-1 text-[10px] font-semibold">
            {["Pedido", "Pago", "Separando", "Sacolinha", "Concluído"].map(
              (s, i) => (
                <span
                  key={s}
                  className={`flex-1 rounded px-1 py-1.5 text-center ${
                    i <= 1 ? "bg-[#165DA4] text-white" : "bg-[#F4F4F0]"
                  }`}
                >
                  {s}
                </span>
              ),
            )}
          </div>
          <div className="rounded-lg border border-[#E5E5E0] bg-white p-3 text-sm">
            <p className="font-semibold">{MOCK_ORDER.fulfillment}</p>
            <p className="mt-2 text-[#1A1A1A]/65">{MOCK_ORDER.item.title}</p>
            <p className="mt-1 font-bold text-[#165DA4]">{MOCK_ORDER.total}</p>
          </div>
          <div className="rounded-xl border border-dashed border-[#165DA4] bg-[#165DA4]/5 p-3">
            <p className="text-sm font-bold">Crie seu acesso</p>
            <p className="mt-1 text-[11px] text-[#1A1A1A]/70">
              Veja sua Sacolinha e acompanhe retiradas — magic link no e-mail do
              pedido.
            </p>
            <button
              type="button"
              className="mt-2 rounded-md bg-[#165DA4] px-3 py-2 text-xs font-bold text-white"
            >
              Enviar link de acesso
            </button>
          </div>
        </div>
      )}

      {screen === "admin-ia" && (
        <div className="mx-auto max-w-lg space-y-3 p-3">
          <h1 className="font-heading text-lg font-extrabold">Cadastrar com IA</h1>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex aspect-square items-center justify-center rounded-lg border-2 border-dashed border-[#E5E5E0] bg-white text-[11px] font-semibold text-[#1A1A1A]/50">
              + Fotos
            </div>
            <div className="flex aspect-square items-center justify-center rounded-lg border-2 border-dashed border-[#E5E5E0] bg-white text-[11px] font-semibold text-[#1A1A1A]/50">
              ● Gravar áudio
            </div>
          </div>
          <button
            type="button"
            className="w-full rounded-md bg-[#165DA4] py-2.5 text-sm font-bold text-white"
          >
            Gerar preview
          </button>
          <div className="space-y-2 rounded-lg border border-[#E5E5E0] bg-white p-3">
            <p className="text-[10px] font-bold uppercase text-[#8EB038]">
              Preview editável
            </p>
            {(
              Object.entries(MOCK_AI_DRAFT) as [string, string][]
            ).map(([k, v]) => (
              <label key={k} className="block text-[11px]">
                <span className="font-semibold capitalize">{k}</span>
                <input
                  className="mt-0.5 w-full rounded border border-[#E5E5E0] px-2 py-1.5"
                  defaultValue={v}
                />
              </label>
            ))}
            <button
              type="button"
              className="w-full rounded-md bg-[#8EB038] py-2.5 text-sm font-bold text-white"
            >
              Confirmar + imprimir etiqueta
            </button>
            <p className="text-center text-[10px] text-[#1A1A1A]/55">
              Fila térmica: 3/12 impressas · sequencial com ACK
            </p>
          </div>
        </div>
      )}

      {screen === "admin-fila" && (
        <div className="mx-auto max-w-lg space-y-2 p-3">
          <h1 className="font-heading text-lg font-extrabold">Pedidos</h1>
          {MOCK_QUEUE.map((o) => (
            <article
              key={o.code}
              className={`rounded-lg border bg-white p-3 ${
                o.type === "entrega_imediata"
                  ? "border-[#EB5E5C] ring-1 ring-[#EB5E5C]"
                  : "border-[#E5E5E0]"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-bold">{o.code}</p>
                  <p className="text-[11px] text-[#1A1A1A]/65">{o.customer}</p>
                </div>
                {o.type === "entrega_imediata" ? (
                  <span className="rounded bg-[#EB5E5C] px-2 py-0.5 text-[9px] font-bold text-white">
                    ENTREGA URGENTE
                  </span>
                ) : (
                  <span className="rounded bg-[#F4F4F0] px-2 py-0.5 text-[9px] font-bold">
                    SACOLINHA
                  </span>
                )}
              </div>
              <p className="mt-2 text-xs">
                {o.items} itens · {o.total}
                {"frete" in o && o.frete ? ` · frete ${o.frete}` : ""}
              </p>
              <button
                type="button"
                className="mt-2 w-full rounded-md bg-[#165DA4] py-2 text-xs font-bold text-white"
              >
                Conferir e separar
              </button>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
