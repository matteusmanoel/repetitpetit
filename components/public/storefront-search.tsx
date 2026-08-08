"use client";

import { Loader2, Search, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FormEvent,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

import { formatPrice } from "@/features/catalog/format-price";
import { cn } from "@/lib/utils";

type Suggestion = {
  id: string;
  name: string;
  slug: string;
  brand: string | null;
  size_label: string | null;
  price: number;
  cover_image_url: string | null;
};

type StorefrontSearchProps = {
  /** Compact under-logo mobile row vs inline desktop. */
  variant?: "desktop" | "mobile";
  className?: string;
};

/**
 * Busca do header com autocomplete (SS-2 / D131 shape).
 */
export function StorefrontSearch({
  variant = "desktop",
  className,
}: StorefrontSearchProps) {
  const router = useRouter();
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<Suggestion[]>([]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const handle = window.setTimeout(() => {
      void (async () => {
        try {
          const res = await fetch(
            `/api/catalog/search?q=${encodeURIComponent(q)}`,
          );
          const data = (await res.json()) as { items?: Suggestion[] };
          setItems(data.items ?? []);
        } catch {
          setItems([]);
        } finally {
          setLoading(false);
        }
      })();
    }, 220);

    return () => window.clearTimeout(handle);
  }, [query]);

  function goCatalog(q: string) {
    const trimmed = q.trim();
    setOpen(false);
    if (trimmed) {
      router.push(`/catalogo?q=${encodeURIComponent(trimmed)}`);
    } else {
      router.push("/catalogo");
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    goCatalog(query);
  }

  const showPopover = open && query.trim().length >= 2;

  return (
    <form
      onSubmit={handleSubmit}
      className={cn("relative min-w-0", className)}
      role="search"
    >
      <label className="sr-only" htmlFor={`storefront-search-${variant}`}>
        Buscar
      </label>
      <input
        ref={inputRef}
        id={`storefront-search-${variant}`}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          window.setTimeout(() => setOpen(false), 150);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setOpen(false);
            inputRef.current?.blur();
          }
        }}
        placeholder="O que você procura?"
        autoComplete="off"
        aria-autocomplete="list"
        aria-controls={listId}
        className={cn(
          "w-full rounded-full border-2 border-primary/50 bg-card px-5 pr-12 text-base text-foreground placeholder:text-foreground/40",
          variant === "desktop"
            ? "h-12 md:h-[3.25rem] md:text-lg"
            : "h-11",
        )}
      />
      <button
        type="submit"
        className={cn(
          "absolute right-3 flex items-center justify-center rounded-full text-primary transition hover:bg-primary/10",
          variant === "desktop"
            ? "top-1/2 size-9 -translate-y-1/2"
            : "right-3 top-1/2 size-8 -translate-y-1/2",
        )}
        aria-label="Buscar"
      >
        <Search className="size-5" />
      </button>

      {query ? (
        <button
          type="button"
          className="absolute right-12 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center text-muted-foreground"
          aria-label="Limpar busca"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            setQuery("");
            setItems([]);
            inputRef.current?.focus();
          }}
        >
          <X className="size-4" />
        </button>
      ) : null}

      {showPopover ? (
        <div
          id={listId}
          className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-40 overflow-hidden rounded-2xl border border-border bg-card shadow-xl"
          role="listbox"
        >
          {loading ? (
            <p className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Buscando…
            </p>
          ) : items.length === 0 ? (
            <p className="px-4 py-3 text-sm text-muted-foreground">
              Nenhuma peça encontrada
            </p>
          ) : (
            <ul className="max-h-72 overflow-auto py-1">
              {items.map((item) => (
                <li key={item.id}>
                  <Link
                    href={`/produto/${item.slug}`}
                    role="option"
                    className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/70"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => setOpen(false)}
                  >
                    <span className="relative size-10 shrink-0 overflow-hidden rounded-lg bg-muted">
                      {item.cover_image_url ? (
                        <Image
                          src={item.cover_image_url}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="40px"
                        />
                      ) : null}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-foreground">
                        {item.name}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {[item.size_label, item.brand].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                    <span className="shrink-0 text-sm font-bold text-primary">
                      {formatPrice(item.price)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            className="w-full border-t border-border px-4 py-3 text-left text-sm font-semibold text-primary hover:bg-muted/50"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => goCatalog(query)}
          >
            Ver todos no catálogo
          </button>
        </div>
      ) : null}
    </form>
  );
}
