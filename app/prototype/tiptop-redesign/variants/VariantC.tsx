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

/** PROTOTYPE Variant C — Fluid editorial (full-bleed bands, minimal chrome). */

type Props = { screen: ScreenId; onScreen: (id: ScreenId) => void };

function EdgeNav({ screen, onScreen }: Props) {
  return (
    <div className="fixed right-3 top-1/2 z-30 hidden -translate-y-1/2 flex-col gap-1 md:flex">
      {SCREENS.map((s) => (
        <button
          key={s.id}
          type="button"
          title={s.label}
          onClick={() => onScreen(s.id)}
          className={`size-2.5 rounded-full ${
            screen === s.id ? "bg-[#165DA4]" : "bg-[#1A1A1A]/25"
          }`}
        />
      ))}
    </div>
  );
}

function MobileScreenStrip({ screen, onScreen }: Props) {
  return (
    <div className="flex gap-2 overflow-x-auto px-4 py-3 md:hidden">
      {SCREENS.map((s) => (
        <button
          key={s.id}
          type="button"
          onClick={() => onScreen(s.id)}
          className={`shrink-0 border-b-2 px-1 pb-1 text-[10px] font-bold uppercase tracking-wider ${
            screen === s.id
              ? "border-[#165DA4] text-[#165DA4]"
              : "border-transparent text-[#1A1A1A]/40"
          }`}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}

export function VariantC({ screen, onScreen }: Props) {
  return (
    <div className="min-h-screen bg-white pb-24 font-sans text-[#1A1A1A]">
      <p className="bg-[#1A1A1A] px-4 py-1 text-center text-[10px] font-medium tracking-widest text-white">
        PROTOTYPE C — Fluid editorial · full-bleed · chrome mínimo
      </p>
      <EdgeNav screen={screen} onScreen={onScreen} />
      <MobileScreenStrip screen={screen} onScreen={onScreen} />

      {screen === "home" && (
        <>
          <section className="relative flex min-h-[70vh] items-end bg-[#165DA4]">
            <Image
              src="/repeti-petit-demo-assets/banner-01.webp"
              alt=""
              fill
              className="object-cover mix-blend-luminosity opacity-50"
            />
            <div className="relative z-10 w-full p-8 text-white md:p-16">
              <Image
                src="/brand/logo.png"
                alt="Repeti Petit"
                width={140}
                height={48}
                className="mb-6 h-10 w-auto brightness-0 invert"
              />
              <h1 className="max-w-xl font-heading text-5xl font-extrabold leading-[0.95] md:text-7xl">
                Crescer
                <br />
                com estilo
              </h1>
              <button
                type="button"
                onClick={() => onScreen("catalog")}
                className="mt-8 border-b-2 border-white pb-1 text-sm font-bold tracking-wide"
              >
                Entrar no catálogo
              </button>
            </div>
          </section>
          {MOCK_CATEGORIES.map((c, i) => (
            <button
              key={c.name}
              type="button"
              onClick={() => onScreen("catalog")}
              className="relative flex min-h-[40vh] w-full items-center justify-center overflow-hidden"
            >
              <Image
                src={c.image}
                alt=""
                fill
                className={`object-cover ${i % 2 === 0 ? "" : "scale-105"}`}
              />
              <span className="relative z-10 bg-white/90 px-8 py-4 font-heading text-3xl font-extrabold backdrop-blur-sm">
                {c.name}
              </span>
            </button>
          ))}
        </>
      )}

      {screen === "catalog" && (
        <div>
          <div className="border-b border-[#E5E5E0] px-8 py-10">
            <h1 className="font-heading text-4xl font-extrabold md:text-6xl">
              Catálogo
            </h1>
            <p className="mt-2 max-w-md text-sm text-[#1A1A1A]/55">
              Peça única. Sem filtros densos — só olhar e escolher.
            </p>
          </div>
          <div className="columns-2 gap-0 md:columns-3">
            {MOCK_PRODUCTS.map((p, i) => (
              <button
                key={p.id}
                type="button"
                onClick={() => onScreen("pdp")}
                className="mb-0 block w-full break-inside-avoid text-left"
              >
                <div
                  className={`relative ${i % 3 === 0 ? "aspect-[3/4]" : "aspect-square"}`}
                >
                  <Image src={p.image} alt="" fill className="object-cover" />
                </div>
                <div className="flex items-baseline justify-between gap-2 px-3 py-3">
                  <span className="font-heading text-sm font-bold leading-tight">
                    {p.title}
                  </span>
                  <span className="shrink-0 text-sm font-semibold text-[#165DA4]">
                    {p.price}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {screen === "pdp" && (
        <div className="grid md:grid-cols-2">
          <div className="relative min-h-[60vh] md:min-h-screen">
            <Image
              src={MOCK_PRODUCTS[0].image}
              alt=""
              fill
              className="object-cover"
            />
          </div>
          <div className="flex flex-col justify-center p-10 md:p-16">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8EB038]">
              Peça única
            </p>
            <h1 className="mt-4 font-heading text-4xl font-extrabold leading-none md:text-5xl">
              {MOCK_PRODUCTS[0].title}
            </h1>
            <p className="mt-6 text-3xl font-light">{MOCK_PRODUCTS[0].price}</p>
            <dl className="mt-8 space-y-2 border-t border-[#E5E5E0] pt-6 text-sm">
              <div className="flex justify-between">
                <dt className="text-[#1A1A1A]/5">Tamanho</dt>
                <dd>4A</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[#1A1A1A]/5">Marca</dt>
                <dd>Carter&apos;s</dd>
              </div>
            </dl>
            <button
              type="button"
              onClick={() => onScreen("checkout")}
              className="mt-10 bg-[#165DA4] py-4 text-sm font-bold text-white"
            >
              Comprar agora
            </button>
          </div>
        </div>
      )}

      {screen === "checkout" && (
        <div className="mx-auto grid max-w-5xl gap-0 md:grid-cols-2">
          <div className="bg-[#FAFAF7] p-10 md:min-h-screen md:p-16">
            <h1 className="font-heading text-4xl font-extrabold">Checkout</h1>
            <p className="mt-4 text-sm text-[#1A1A1A]/55">
              Poucos dados. Foco no pagamento.
            </p>
            <div className="mt-10 space-y-4">
              <div className="border-l-4 border-[#165DA4] bg-white p-4">
                <p className="font-heading text-xl font-bold">Sacolinha</p>
                <p className="text-xs text-[#1A1A1A]/6">Selecionado · default</p>
              </div>
              <div className="border-l-4 border-transparent bg-white/50 p-4">
                <p className="font-heading text-xl font-bold">Entrega imediata</p>
                <p className="text-xs text-[#1A1A1A]/6">CEP + calcular frete</p>
              </div>
            </div>
          </div>
          <div className="flex flex-col justify-center p-10 md:p-16">
            <input
              className="border-b border-[#E5E5E0] bg-transparent py-3 text-sm outline-none"
              placeholder="Nome"
              defaultValue="Maria Lima"
            />
            <input
              className="border-b border-[#E5E5E0] bg-transparent py-3 text-sm outline-none"
              placeholder="E-mail"
              defaultValue="maria@email.com"
            />
            <input
              className="border-b border-[#E5E5E0] bg-transparent py-3 text-sm outline-none"
              placeholder="Telefone"
              defaultValue="(45) 99999-0000"
            />
            <div className="mt-10 flex items-end justify-between">
              <span className="text-sm">Total</span>
              <span className="font-heading text-3xl font-extrabold text-[#165DA4]">
                R$ 45,00
              </span>
            </div>
            <button
              type="button"
              onClick={() => onScreen("pedido")}
              className="mt-6 w-full bg-[#8EB038] py-4 text-sm font-bold text-white"
            >
              Ir ao pagamento
            </button>
          </div>
        </div>
      )}

      {screen === "pedido" && (
        <div className="mx-auto max-w-2xl px-8 py-16">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#8EB038]">
            Confirmado
          </p>
          <h1 className="mt-4 font-heading text-5xl font-extrabold leading-none">
            {MOCK_ORDER.code}
          </h1>
          <p className="mt-6 text-lg">{MOCK_ORDER.status}</p>
          <div className="mt-12 border-y border-[#E5E5E0] py-8">
            <p className="font-heading text-2xl font-bold">Sacolinha</p>
            <p className="mt-2 text-sm text-[#1A1A1A]/6">
              {MOCK_ORDER.item.title} — retire quando quiser
            </p>
          </div>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-sm text-sm text-[#1A1A1A]/65">
              Tooltip discreto: crie acesso por magic link para consultar a
              Sacolinha.
            </p>
            <button
              type="button"
              className="shrink-0 border border-[#165DA4] px-5 py-2.5 text-xs font-bold text-[#165DA4]"
            >
              Enviar magic link
            </button>
          </div>
        </div>
      )}

      {screen === "admin-ia" && (
        <div className="grid min-h-[80vh] md:grid-cols-2">
          <div className="flex flex-col justify-center bg-[#1A1A1A] p-10 text-white md:p-16">
            <h1 className="font-heading text-4xl font-extrabold">Intake</h1>
            <p className="mt-4 text-sm opacity-70">Áudio + imagem → draft IA</p>
            <div className="mt-10 space-y-3">
              <div className="border border-white/20 p-6 text-center text-sm">
                Drop fotos
              </div>
              <div className="border border-white/20 p-6 text-center text-sm">
                Hold to talk
              </div>
            </div>
          </div>
          <div className="flex flex-col justify-center p-10 md:p-16">
            <p className="text-xs font-bold uppercase tracking-widest text-[#8EB038]">
              Preview
            </p>
            <h2 className="mt-2 font-heading text-3xl font-extrabold">
              {MOCK_AI_DRAFT.title}
            </h2>
            <p className="mt-4 text-sm">
              {MOCK_AI_DRAFT.brand} · {MOCK_AI_DRAFT.size} · R${" "}
              {MOCK_AI_DRAFT.price}
            </p>
            <p className="mt-4 text-sm text-[#1A1A1A]/55">
              {MOCK_AI_DRAFT.description}
            </p>
            <button
              type="button"
              className="mt-10 bg-[#165DA4] py-4 text-sm font-bold text-white"
            >
              Confirmar · fila térmica ACK
            </button>
          </div>
        </div>
      )}

      {screen === "admin-fila" && (
        <div className="px-4 py-10 md:px-16">
          <h1 className="font-heading text-4xl font-extrabold md:text-6xl">
            Fila
          </h1>
          <div className="mt-10 divide-y divide-[#E5E5E0] border-y border-[#E5E5E0]">
            {MOCK_QUEUE.map((o) => (
              <div
                key={o.code}
                className="flex flex-wrap items-center justify-between gap-4 py-6"
              >
                <div>
                  <p className="font-heading text-2xl font-bold">{o.code}</p>
                  <p className="text-sm text-[#1A1A1A]/55">{o.customer}</p>
                </div>
                <div className="flex items-center gap-3">
                  {o.type === "entrega_imediata" ? (
                    <span className="bg-[#EB5E5C] px-3 py-1 text-[10px] font-bold text-white">
                      URGENTE
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#1A1A1A]/4">
                      Sacolinha
                    </span>
                  )}
                  <button
                    type="button"
                    className="bg-[#165DA4] px-4 py-2 text-xs font-bold text-white"
                  >
                    Separar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
