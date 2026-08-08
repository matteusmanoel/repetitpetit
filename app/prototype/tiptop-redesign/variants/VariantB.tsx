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

/** PROTOTYPE Variant B — Soft kids boutique (air, large display, calm). */

type Props = { screen: ScreenId; onScreen: (id: ScreenId) => void };

function SoftTabs({ screen, onScreen }: Props) {
  return (
    <div className="flex justify-center gap-2 px-4 pb-3 pt-2">
      {SCREENS.map((s) => (
        <button
          key={s.id}
          type="button"
          onClick={() => onScreen(s.id)}
          className={`rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${
            screen === s.id
              ? "bg-[#165DA4] text-white shadow-md"
              : "bg-white/80 text-[#1A1A1A]/70"
          }`}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}

export function VariantB({ screen, onScreen }: Props) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#E8F2FC] via-[#FAFAF7] to-[#F4F8E8] pb-28 font-sans text-[#1A1A1A]">
      <div className="bg-[#8EB038]/15 px-4 py-1 text-center text-[10px] font-bold text-[#165DA4]">
        PROTOTYPE B — Soft kids boutique · ar + display + rounded
      </div>

      <header className="px-6 pb-2 pt-6 text-center">
        <Image
          src="/brand/logo.png"
          alt="Repeti Petit"
          width={160}
          height={52}
          className="mx-auto h-12 w-auto object-contain"
        />
        <p className="mt-2 font-heading text-3xl font-extrabold tracking-tight text-[#165DA4]">
          Repeti Petit
        </p>
        <p className="mt-1 text-sm text-[#1A1A1A]/60">Brechó infantil com carinho</p>
      </header>
      <SoftTabs screen={screen} onScreen={onScreen} />

      {screen === "home" && (
        <div className="mx-auto max-w-2xl space-y-10 px-6">
          <section className="overflow-hidden rounded-[2rem] shadow-lg shadow-[#165DA4]/10">
            <div className="relative aspect-[5/4]">
              <Image
                src="/repeti-petit-demo-assets/banner-02.webp"
                alt=""
                fill
                className="object-cover"
              />
            </div>
            <div className="space-y-3 bg-white p-6 text-center">
              <h2 className="font-heading text-2xl font-extrabold">
                Peças únicas para crescer com história
              </h2>
              <p className="text-sm text-[#1A1A1A]/65">
                Escolha, pague e guarde na Sacolinha — retire quando quiser.
              </p>
              <button
                type="button"
                onClick={() => onScreen("catalog")}
                className="rounded-full bg-[#165DA4] px-8 py-3 text-sm font-bold text-white"
              >
                Explorar peças
              </button>
            </div>
          </section>
          <section>
            <h3 className="mb-4 text-center font-heading text-xl font-extrabold">
              Categorias
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {MOCK_CATEGORIES.map((c) => (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => onScreen("catalog")}
                  className="overflow-hidden rounded-3xl bg-white shadow-sm"
                >
                  <div className="relative aspect-square">
                    <Image src={c.image} alt="" fill className="object-cover" />
                  </div>
                  <p className="py-3 text-sm font-bold">{c.name}</p>
                </button>
              ))}
            </div>
          </section>
        </div>
      )}

      {screen === "catalog" && (
        <div className="mx-auto max-w-2xl px-6">
          <h2 className="mb-6 text-center font-heading text-2xl font-extrabold">
            Catálogo
          </h2>
          <div className="mb-6 flex flex-wrap justify-center gap-2">
            {["Todos", "Menina", "Menino", "4A–6A"].map((f) => (
              <span
                key={f}
                className="rounded-full bg-white px-4 py-2 text-xs font-semibold shadow-sm"
              >
                {f}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-5">
            {MOCK_PRODUCTS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => onScreen("pdp")}
                className="overflow-hidden rounded-3xl bg-white text-left shadow-md shadow-black/5"
              >
                <div className="relative aspect-[4/5]">
                  <Image src={p.image} alt="" fill className="object-cover" />
                </div>
                <div className="space-y-1 p-4">
                  <p className="font-heading text-base font-bold leading-snug">
                    {p.title}
                  </p>
                  <p className="text-xs text-[#1A1A1A]/50">
                    {p.size} · {p.brand}
                  </p>
                  <p className="text-lg font-bold text-[#165DA4]">{p.price}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {screen === "pdp" && (
        <div className="mx-auto max-w-md px-6">
          <div className="overflow-hidden rounded-[2rem] bg-white shadow-lg">
            <div className="relative aspect-square">
              <Image
                src={MOCK_PRODUCTS[0].image}
                alt=""
                fill
                className="object-cover"
              />
            </div>
            <div className="space-y-4 p-6">
              <h1 className="font-heading text-2xl font-extrabold leading-tight">
                {MOCK_PRODUCTS[0].title}
              </h1>
              <p className="text-3xl font-bold text-[#8EB038]">
                {MOCK_PRODUCTS[0].price}
              </p>
              <p className="text-sm leading-relaxed text-[#1A1A1A]/65">
                Peça única, seminova, pronta para a Sacolinha após o pagamento.
              </p>
              <button
                type="button"
                onClick={() => onScreen("checkout")}
                className="w-full rounded-full bg-[#165DA4] py-4 text-sm font-bold text-white"
              >
                Quero esta peça
              </button>
            </div>
          </div>
        </div>
      )}

      {screen === "checkout" && (
        <div className="mx-auto max-w-md space-y-6 px-6">
          <h1 className="text-center font-heading text-2xl font-extrabold">
            Quase lá
          </h1>
          <div className="space-y-3 rounded-[1.5rem] bg-white p-5 shadow-md">
            <p className="text-center text-xs font-bold uppercase tracking-widest text-[#8EB038]">
              Como receber
            </p>
            <button
              type="button"
              className="w-full rounded-2xl bg-[#165DA4] p-4 text-left text-white"
            >
              <span className="block font-heading text-lg font-extrabold">
                Sacolinha
              </span>
              <span className="text-xs opacity-90">
                Default · retire quando quiser
              </span>
            </button>
            <button
              type="button"
              className="w-full rounded-2xl border-2 border-[#E5E5E0] bg-[#FAFAF7] p-4 text-left"
            >
              <span className="block font-heading text-lg font-extrabold">
                Entrega imediata
              </span>
              <span className="text-xs text-[#1A1A1A]/60">Calcular frete depois</span>
            </button>
          </div>
          <div className="space-y-3 rounded-[1.5rem] bg-white p-5 shadow-md">
            <input
              className="w-full rounded-2xl bg-[#F4F4F0] px-4 py-3 text-sm"
              placeholder="Seu nome"
              defaultValue="Maria Lima"
            />
            <input
              className="w-full rounded-2xl bg-[#F4F4F0] px-4 py-3 text-sm"
              placeholder="E-mail"
              defaultValue="maria@email.com"
            />
            <input
              className="w-full rounded-2xl bg-[#F4F4F0] px-4 py-3 text-sm"
              placeholder="WhatsApp"
              defaultValue="(45) 99999-0000"
            />
          </div>
          <button
            type="button"
            onClick={() => onScreen("pedido")}
            className="w-full rounded-full bg-[#8EB038] py-4 text-sm font-bold text-white shadow-lg"
          >
            Pagar R$ 45,00
          </button>
        </div>
      )}

      {screen === "pedido" && (
        <div className="mx-auto max-w-md space-y-6 px-6 text-center">
          <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-[#8EB038] text-2xl text-white">
            ✓
          </div>
          <h1 className="font-heading text-2xl font-extrabold">
            Pagamento confirmado
          </h1>
          <p className="text-sm text-[#1A1A1A]/65">{MOCK_ORDER.code}</p>
          <div className="rounded-[1.5rem] bg-white p-5 text-left shadow-md">
            <p className="font-heading text-lg font-bold">Na Sacolinha</p>
            <p className="mt-1 text-sm text-[#1A1A1A]/65">
              {MOCK_ORDER.item.title} · {MOCK_ORDER.total}
            </p>
          </div>
          <div className="rounded-[1.5rem] border-2 border-[#165DA4]/20 bg-white p-5 text-left">
            <p className="font-heading text-base font-bold">Quer ver sua Sacolinha?</p>
            <p className="mt-1 text-xs text-[#1A1A1A]/60">
              Enviamos um magic link discreto — sem senha.
            </p>
            <button
              type="button"
              className="mt-3 w-full rounded-full bg-[#165DA4] py-3 text-xs font-bold text-white"
            >
              Receber acesso
            </button>
          </div>
        </div>
      )}

      {screen === "admin-ia" && (
        <div className="mx-auto max-w-md space-y-5 px-6">
          <h1 className="text-center font-heading text-2xl font-extrabold">
            Intake com IA
          </h1>
          <div className="rounded-[1.5rem] bg-white p-6 text-center shadow-md">
            <p className="text-sm text-[#1A1A1A]/65">
              Siga o roteiro de fala, anexe fotos e gere o preview.
            </p>
            <div className="mt-4 flex justify-center gap-3">
              <span className="rounded-full bg-[#F4F4F0] px-4 py-3 text-xs font-bold">
                Fotos
              </span>
              <span className="rounded-full bg-[#165DA4] px-4 py-3 text-xs font-bold text-white">
                Áudio
              </span>
            </div>
          </div>
          <div className="space-y-3 rounded-[1.5rem] bg-white p-5 shadow-md">
            <p className="text-center text-xs font-bold text-[#8EB038]">
              Preview · edite antes de confirmar
            </p>
            <p className="font-heading text-lg font-bold">{MOCK_AI_DRAFT.title}</p>
            <p className="text-sm">
              {MOCK_AI_DRAFT.brand} · {MOCK_AI_DRAFT.size} · R$ {MOCK_AI_DRAFT.price}
            </p>
            <button
              type="button"
              className="w-full rounded-full bg-[#8EB038] py-3 text-sm font-bold text-white"
            >
              Confirmar e imprimir
            </button>
          </div>
        </div>
      )}

      {screen === "admin-fila" && (
        <div className="mx-auto max-w-md space-y-4 px-6">
          <h1 className="text-center font-heading text-2xl font-extrabold">
            Fila da loja
          </h1>
          {MOCK_QUEUE.map((o) => (
            <article
              key={o.code}
              className={`rounded-[1.5rem] bg-white p-5 shadow-md ${
                o.type === "entrega_imediata" ? "ring-2 ring-[#EB5E5C]" : ""
              }`}
            >
              {o.type === "entrega_imediata" && (
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-[#EB5E5C]">
                  Prioridade · entrega urgente
                </p>
              )}
              <p className="font-heading text-lg font-bold">{o.code}</p>
              <p className="text-sm text-[#1A1A1A]/60">{o.customer}</p>
              <button
                type="button"
                className="mt-3 w-full rounded-full bg-[#165DA4] py-2.5 text-xs font-bold text-white"
              >
                Separar
              </button>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
