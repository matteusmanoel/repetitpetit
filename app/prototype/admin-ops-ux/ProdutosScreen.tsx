"use client";

import { useEffect, useMemo, useState } from "react";
import { Mic, Plus, ShieldAlert, Sparkles, Trash2, Upload, X } from "lucide-react";
import { protoToast } from "./proto-toast";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  PRODUCT_STATUS_LABELS,
  PRODUCT_STATUSES,
  type ProductStatus,
} from "@/features/admin/product-constants";

import { formatBRL, type MockProductRow } from "./mock-data";
import { usePrototypeState } from "./prototype-state";

const PAGE_SIZE = 6;

function statusLabel(status: string) {
  return (
    PRODUCT_STATUS_LABELS[status as ProductStatus] ?? status
  );
}

function galleryOf(row: MockProductRow): string[] {
  if (row.images?.length) return row.images;
  return row.image ? [row.image] : [];
}

function useNow(tickMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), tickMs);
    return () => window.clearInterval(id);
  }, [tickMs]);
  return now;
}

function formatRemain(ms: number): string {
  if (ms <= 0) return "00:00";
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

export function ProdutosScreen() {
  const { products, categories, addCategory, upsertProduct } =
    usePrototypeState();
  const now = useNow();
  const [query, setQuery] = useState("");
  const [chip, setChip] = useState<"all" | "available" | "hold" | "sold">(
    "all",
  );
  const [page, setPage] = useState(0);
  const [modal, setModal] = useState<MockProductRow | "new" | null>(null);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (chip !== "all" && p.status !== chip) return false;
      if (query && !p.name.toLowerCase().includes(query.toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [products, chip, query]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice(
    page * PAGE_SIZE,
    page * PAGE_SIZE + PAGE_SIZE,
  );

  return (
    <div className="mx-auto max-w-5xl space-y-4 pb-28">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Produtos
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Holds com timer e override · slug automático
          </p>
        </div>
        <button
          type="button"
          className="inline-flex h-12 cursor-pointer items-center gap-2 rounded-2xl bg-[var(--brand-green)] px-4 text-sm font-bold text-white shadow-sm"
          onClick={() => setModal("new")}
        >
          <Plus className="size-5" />
          Produto
        </button>
      </header>

      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(0);
          }}
          placeholder="Buscar peça…"
          className="h-14 flex-1 rounded-2xl border border-black/10 bg-white px-4 text-base shadow-sm"
        />
        <div className="flex gap-2 overflow-x-auto">
          {(
            [
              { id: "all" as const, label: "Todos" },
              { id: "available" as const, label: "Disponível" },
              { id: "hold" as const, label: "Em hold" },
              { id: "sold" as const, label: "Vendido" },
            ] as const
          ).map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                setChip(c.id);
                setPage(0);
              }}
              className={`h-12 shrink-0 cursor-pointer rounded-2xl px-4 text-sm font-medium ${
                chip === c.id
                  ? "bg-foreground text-background"
                  : "bg-white text-muted-foreground shadow-sm ring-1 ring-black/5"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        {filtered.length} produto(s)
      </p>

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {pageItems.map((p) => {
          const remain = p.holdExpiresAt
            ? new Date(p.holdExpiresAt).getTime() - now
            : null;
          return (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => setModal(p)}
                className="group relative w-full cursor-pointer overflow-hidden rounded-2xl border border-black/5 bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="relative aspect-[3/4] bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.image}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                  <span className="absolute left-2 top-2 rounded-full bg-white/95 px-2 py-1 text-[11px] font-semibold shadow">
                    {statusLabel(p.status)}
                  </span>
                  {p.status === "hold" && remain != null ? (
                    <span
                      className={`absolute right-2 top-2 rounded-full px-2 py-1 font-mono text-[11px] font-bold shadow ${
                        remain < 5 * 60 * 1000
                          ? "bg-[var(--brand-pink)] text-white"
                          : "bg-amber-100 text-amber-950"
                      }`}
                    >
                      {formatRemain(remain)}
                    </span>
                  ) : null}
                </div>
                <div className="space-y-1 p-3">
                  {(p.sizeLabel || p.brand) && (
                    <p className="text-sm font-semibold text-[var(--brand-blue)]">
                      {[p.sizeLabel, p.brand].filter(Boolean).join(" · ")}
                    </p>
                  )}
                  <p className="line-clamp-2 text-sm font-medium">{p.name}</p>
                  {p.status === "hold" && p.holdCustomerName ? (
                    <p className="truncate text-xs font-medium text-amber-800">
                      Hold · {p.holdCustomerName}
                    </p>
                  ) : p.status === "hold" ? (
                    <p className="text-xs text-amber-800">Hold · sem cliente</p>
                  ) : null}
                  <p className="text-lg font-bold text-[var(--brand-green)]">
                    {formatBRL(p.priceCents)}
                  </p>
                </div>
                {p.status === "hold" ? (
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      upsertProduct({
                        ...p,
                        status: "available",
                        holdExpiresAt: undefined,
                        holdCustomerName: undefined,
                      });
                      protoToast.success("Override: hold liberado", p.name);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") e.currentTarget.click();
                    }}
                    className="absolute bottom-3 right-3 inline-flex h-10 cursor-pointer items-center gap-1 rounded-full bg-[var(--brand-pink)] px-3 text-[11px] font-bold text-white shadow-md"
                  >
                    <ShieldAlert className="size-3.5" />
                    Override
                  </span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          disabled={page <= 0}
          onClick={() => setPage((p) => p - 1)}
          className="h-12 cursor-pointer rounded-2xl bg-white px-4 text-sm font-medium shadow-sm ring-1 ring-black/5 disabled:opacity-40"
        >
          Anterior
        </button>
        <p className="text-sm text-muted-foreground">
          Página {page + 1} / {pageCount} · {filtered.length} total
        </p>
        <button
          type="button"
          disabled={page >= pageCount - 1}
          onClick={() => setPage((p) => p + 1)}
          className="h-12 cursor-pointer rounded-2xl bg-white px-4 text-sm font-medium shadow-sm ring-1 ring-black/5 disabled:opacity-40"
        >
          Próxima
        </button>
      </div>

      {modal ? (
        <ProductModal
          initial={
            modal === "new"
              ? {
                  id: `p-${crypto.randomUUID().slice(0, 8)}`,
                  name: "",
                  category: categories[0]?.name ?? "",
                  status: "available",
                  priceCents: 0,
                  image: products[0]?.image ?? "",
                  sizeLabel: "",
                  brand: "",
                  description: "",
                  sortOrder: products.length + 1,
                }
              : modal
          }
          categories={categories}
          onAddCategory={addCategory}
          onClose={() => setModal(null)}
          onSave={(row) => {
            upsertProduct(row);
            setModal(null);
            protoToast.success("Produto salvo");
          }}
        />
      ) : null}
    </div>
  );
}

function ProductModal({
  initial,
  categories,
  onAddCategory,
  onClose,
  onSave,
}: {
  initial: MockProductRow;
  categories: { id: string; name: string }[];
  onAddCategory: (name: string) => { id: string; name: string };
  onClose: () => void;
  onSave: (row: MockProductRow) => void;
}) {
  const [row, setRow] = useState(initial);
  const [images, setImages] = useState<string[]>(() => galleryOf(initial));
  const [newCat, setNewCat] = useState("");
  const [creatingCat, setCreatingCat] = useState(false);
  const [recording, setRecording] = useState(false);
  const [hasAudio, setHasAudio] = useState(false);
  const [processing, setProcessing] = useState(false);

  function setGallery(next: string[]) {
    setImages(next);
    setRow((r) => ({
      ...r,
      images: next,
      image: next[0] ?? "",
    }));
  }

  function toggleRecord() {
    if (recording) {
      setRecording(false);
      setHasAudio(true);
      protoToast.success("Áudio gravado (mock)");
      return;
    }
    setRecording(true);
    setHasAudio(false);
    protoToast.message("Gravando…", "Toque de novo para parar");
  }

  function processAudio() {
    if (!hasAudio || processing) return;
    setProcessing(true);
    protoToast.message("Processando áudio…", "Gerando campos");
    window.setTimeout(() => {
      const cat = categories[0]?.name ?? "Geral";
      setRow((r) => ({
        ...r,
        name: "Conjunto moletom infantil",
        priceCents: 8900,
        sizeLabel: "4 anos",
        brand: "Hering Kids",
        category: cat,
        description:
          "Peça em ótimo estado. Tecido macio, sem manchas. Gerado a partir do áudio (mock).",
      }));
      setProcessing(false);
      protoToast.success("Campos preenchidos pelo áudio");
    }, 900);
  }

  function handleFiles(fileList: FileList | null) {
    if (!fileList?.length) return;
    const files = Array.from(fileList);
    void Promise.all(
      files.map(
        (file) =>
          new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result ?? ""));
            reader.onerror = () => resolve("");
            reader.readAsDataURL(file);
          }),
      ),
    ).then((loaded) => {
      const ok = loaded.filter(Boolean);
      if (!ok.length) return;
      setImages((prev) => {
        const next = [...prev, ...ok];
        setRow((r) => ({
          ...r,
          images: next,
          image: next[0] ?? "",
        }));
        return next;
      });
      protoToast.success(
        ok.length === 1 ? "Foto adicionada" : `${ok.length} fotos adicionadas`,
      );
    });
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-3 sm:items-center sm:p-6">
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-lg font-semibold">
            {initial.name ? "Editar produto" : "Novo produto"}
          </h2>
          <button
            type="button"
            className="cursor-pointer rounded-xl p-2 hover:bg-muted"
            onClick={onClose}
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="grid gap-5 sm:grid-cols-[13rem_1fr]">
            <div className="space-y-2 sm:self-start">
              <div className="space-y-2">
                <div className="relative aspect-[3/4] max-h-64 overflow-hidden rounded-lg border border-border bg-muted sm:max-h-none">
                  {images[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={images[0]}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full min-h-40 items-center justify-center text-sm text-muted-foreground">
                      Sem foto
                    </div>
                  )}
                </div>
                {images.length > 1 ? (
                  <ul className="grid grid-cols-4 gap-1.5">
                    {images.map((src, i) => (
                      <li key={`${src.slice(0, 24)}-${i}`} className="relative">
                        <button
                          type="button"
                          className={`aspect-square w-full cursor-pointer overflow-hidden rounded-md border ${
                            i === 0
                              ? "border-[var(--brand-green)] ring-1 ring-[var(--brand-green)]"
                              : "border-border"
                          }`}
                          onClick={() => {
                            const next = [...images];
                            const [picked] = next.splice(i, 1);
                            next.unshift(picked);
                            setGallery(next);
                          }}
                          title={i === 0 ? "Capa" : "Definir como capa"}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={src}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        </button>
                        <button
                          type="button"
                          className="absolute right-0.5 top-0.5 flex size-6 cursor-pointer items-center justify-center rounded-md bg-black/70 text-white"
                          aria-label="Remover foto"
                          onClick={() =>
                            setGallery(images.filter((_, idx) => idx !== i))
                          }
                        >
                          <Trash2 className="size-3" />
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
                <label className="inline-flex h-8 w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-input bg-transparent px-2.5 text-sm font-medium hover:bg-muted">
                  <Upload className="size-3.5" />
                  {images.length ? "Adicionar fotos" : "Upload"}
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="sr-only"
                    onChange={(e) => {
                      handleFiles(e.target.files);
                      e.target.value = "";
                    }}
                  />
                </label>
                <p className="text-[11px] text-muted-foreground">
                  Várias fotos · a primeira é a capa
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={toggleRecord}
                  className={`inline-flex h-8 flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg text-sm font-medium ${
                    recording
                      ? "bg-[var(--brand-pink)] text-white"
                      : hasAudio
                        ? "border border-[var(--brand-green)]/40 bg-[var(--brand-green)]/10 text-[var(--brand-green)]"
                        : "border border-input bg-transparent"
                  }`}
                  aria-pressed={recording}
                >
                  <Mic className={`size-4 ${recording ? "animate-pulse" : ""}`} />
                  {recording ? "Parar" : hasAudio ? "Regravar" : "Áudio"}
                </button>
                <button
                  type="button"
                  disabled={!hasAudio || processing}
                  onClick={processAudio}
                  className="inline-flex h-8 flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg bg-[var(--brand-blue)] text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Sparkles className="size-4" />
                  {processing ? "…" : "Processar"}
                </button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="prod-name">Nome *</Label>
                <Input
                  id="prod-name"
                  value={row.name}
                  onChange={(e) => setRow({ ...row, name: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="prod-price">Preço (centavos) *</Label>
                <Input
                  id="prod-price"
                  type="number"
                  value={row.priceCents}
                  onChange={(e) =>
                    setRow({ ...row, priceCents: Number(e.target.value) || 0 })
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="prod-order">Ordem</Label>
                <Input
                  id="prod-order"
                  type="number"
                  value={row.sortOrder ?? 0}
                  onChange={(e) =>
                    setRow({ ...row, sortOrder: Number(e.target.value) || 0 })
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="prod-size">Tamanho</Label>
                <Input
                  id="prod-size"
                  value={row.sizeLabel ?? ""}
                  onChange={(e) =>
                    setRow({ ...row, sizeLabel: e.target.value })
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="prod-brand">Marca</Label>
                <Input
                  id="prod-brand"
                  value={row.brand ?? ""}
                  onChange={(e) => setRow({ ...row, brand: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3 sm:col-span-2">
                <div className="space-y-1.5">
                  <Label>Categoria *</Label>
                  <Select
                    value={row.category || undefined}
                    onValueChange={(v) => {
                      if (v === "__new__") {
                        setCreatingCat(true);
                        return;
                      }
                      setRow({ ...row, category: v });
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Categoria" />
                    </SelectTrigger>
                    <SelectContent position="popper">
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.name}>
                          {c.name}
                        </SelectItem>
                      ))}
                      <SelectItem value="__new__">
                        + Criar categoria…
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {creatingCat ? (
                    <div className="mt-2 flex gap-2">
                      <Input
                        placeholder="Nome da categoria"
                        value={newCat}
                        onChange={(e) => setNewCat(e.target.value)}
                      />
                      <button
                        type="button"
                        className="inline-flex h-8 shrink-0 cursor-pointer items-center rounded-lg bg-[var(--brand-green)] px-3 text-sm font-medium text-white"
                        onClick={() => {
                          const created = onAddCategory(newCat);
                          setRow({ ...row, category: created.name });
                          setNewCat("");
                          setCreatingCat(false);
                          protoToast.success("Categoria criada");
                        }}
                      >
                        Criar
                      </button>
                    </div>
                  ) : null}
                </div>

                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <Select
                    value={row.status}
                    onValueChange={(v) => setRow({ ...row, status: v })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent position="popper">
                      {PRODUCT_STATUSES.map((value) => (
                        <SelectItem key={value} value={value}>
                          {PRODUCT_STATUS_LABELS[value]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="prod-desc">Descrição</Label>
                <Textarea
                  id="prod-desc"
                  value={row.description ?? ""}
                  onChange={(e) =>
                    setRow({ ...row, description: e.target.value })
                  }
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 gap-2 border-t border-border p-4">
          <button
            type="button"
            className="h-8 flex-1 cursor-pointer rounded-lg border border-border text-sm font-medium"
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="h-8 flex-1 cursor-pointer rounded-lg bg-[var(--brand-green)] text-sm font-medium text-white"
            onClick={() =>
              onSave({
                ...row,
                images,
                image: images[0] ?? row.image,
              })
            }
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}
