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
 * Foco/clique abre o dropdown com sugestões (recentes ou filtradas).
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
    if (!open) return;

    const q = query.trim();
    setLoading(true);
    const handle = window.setTimeout(() => {
      void (async () => {
        try {
          const url =
            q.length >= 2
              ? `/api/catalog/search?q=${encodeURIComponent(q)}`
              : "/api/catalog/search";
          const res = await fetch(url);
          const data = (await res.json()) as { items?: Suggestion[] };
          setItems(data.items ?? []);
        } catch {
          setItems([]);
        } finally {
          setLoading(false);
        }
      })();
    }, q.length >= 2 ? 220 : 0);

    return () => window.clearTimeout(handle);
  }, [query, open]);

  function openSuggestions() {
    setOpen(true);
  }

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

  const searching = query.trim().length >= 2;
  const showPopover = open;

  return (
    <form
      onSubmit={handleSubmit}
      className={cn("min-w-0", className)}
      role="search"
    >
      <label className="sr-only" htmlFor={`storefront-search-${variant}`}>
        Buscar
      </label>
      <div
        className={cn(
          "relative flex items-center rounded-full border-2 border-primary/50 bg-card",
          variant === "desktop" ? "h-12 md:h-[3.25rem]" : "h-11",
        )}
      >
        <input
          ref={inputRef}
          id={`storefront-search-${variant}`}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={openSuggestions}
          onClick={openSuggestions}
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
          aria-expanded={showPopover}
          aria-controls={listId}
          className={cn(
            "min-w-0 flex-1 border-0 bg-transparent py-0 pl-4 text-base text-foreground outline-none placeholder:text-foreground/40 focus-visible:ring-0",
            variant === "desktop" ? "md:pl-5 md:text-lg" : null,
          )}
        />
        {query ? (
          <button
            type="button"
            className="flex size-8 shrink-0 items-center justify-center text-muted-foreground"
            aria-label="Limpar busca"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              setQuery("");
              inputRef.current?.focus();
              setOpen(true);
            }}
          >
            <X className="size-4" />
          </button>
        ) : null}
        <button
          type="submit"
          className={cn(
            "mr-2.5 flex shrink-0 items-center justify-center rounded-full text-primary transition hover:bg-primary/10",
            variant === "desktop" ? "size-9" : "size-8",
          )}
          aria-label="Buscar"
        >
          <Search className="size-5" strokeWidth={2} />
        </button>

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
                {searching
                  ? "Nenhuma peça encontrada"
                  : "Nenhuma peça disponível no momento"}
              </p>
            ) : (
              <>
                {!searching ? (
                  <p className="border-b border-border px-4 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Sugestões
                  </p>
                ) : null}
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
                            {[item.size_label, item.brand]
                              .filter(Boolean)
                              .join(" · ")}
                          </span>
                        </span>
                        <span className="shrink-0 text-sm font-bold text-primary">
                          {formatPrice(item.price)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            )}
            <button
              type="button"
              className="w-full border-t border-border px-4 py-3 text-left text-sm font-semibold text-primary hover:bg-muted/50"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => goCatalog(query)}
            >
              {searching
                ? `Ver todos no catálogo`
                : "Ver catálogo completo"}
            </button>
          </div>
        ) : null}
      </div>
    </form>
  );
}
