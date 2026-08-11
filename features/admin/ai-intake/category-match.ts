import { FEATURED_BRANDS } from "@/features/storefront/nav";
import type { IntakeDraftItem } from "@/features/admin/ai-intake/schemas";

export type CategoryOptionLike = { id: string; name: string; slug: string };

const BRAND_ALIASES: Record<string, string> = {
  tommy: "Tommy Hilfiger",
  "tommy hilfiger": "Tommy Hilfiger",
  carters: "Carter's",
  "carter's": "Carter's",
  gap: "GAP",
  tiptop: "Tip Top",
  "tip top": "Tip Top",
};

function normalizeKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

/** Canonical brand names for LLM context / selects (featured + aliases). */
export function listBrandCandidates(): string[] {
  const names = new Set<string>([...FEATURED_BRANDS]);
  for (const canonical of Object.values(BRAND_ALIASES)) {
    names.add(canonical);
  }
  return Array.from(names).sort((a, b) => a.localeCompare(b, "pt-BR"));
}

/** Canonical brand string for storage / select (D135). */
export function normalizeBrandName(
  raw: string | null | undefined,
): string | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;
  const key = normalizeKey(trimmed);
  if (BRAND_ALIASES[key]) return BRAND_ALIASES[key];
  const featured = FEATURED_BRANDS.find(
    (b) => normalizeKey(b) === key,
  );
  return featured ?? trimmed;
}

/**
 * Replace known alias / spoken forms of a canonical brand inside free text
 * (e.g. description). Reuses BRAND_ALIASES + normalizeBrandName — no ad-hoc map.
 * Unknown brands: text unchanged.
 */
export function alignTextToCanonicalBrand(
  text: string | null | undefined,
  canonicalBrand: string | null | undefined,
  spokenBrand?: string | null,
): string | null {
  const trimmed = text?.trim() || null;
  if (!trimmed || !canonicalBrand?.trim()) return trimmed;

  const canonical = canonicalBrand.trim();
  const variants = new Set<string>();
  if (spokenBrand?.trim()) variants.add(spokenBrand.trim());

  for (const [aliasKey, target] of Object.entries(BRAND_ALIASES)) {
    if (normalizeKey(target) !== normalizeKey(canonical)) continue;
    variants.add(aliasKey);
    variants.add(target);
  }
  for (const featured of FEATURED_BRANDS) {
    if (normalizeKey(featured) === normalizeKey(canonical)) {
      variants.add(featured);
    }
  }

  // Prefer longer phrases first so "tip top" wins over "tip".
  const ordered = Array.from(variants)
    .filter((v) => v.length > 0 && normalizeKey(v) !== normalizeKey(canonical))
    .sort((a, b) => b.length - a.length);

  let result = trimmed;
  for (const variant of ordered) {
    const escaped = variant.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(escaped, "gi");
    result = result.replace(re, canonical);
  }
  return result;
}

export function matchCategoryByName(
  categories: CategoryOptionLike[],
  rawName: string | null | undefined,
): CategoryOptionLike | null {
  const trimmed = rawName?.trim();
  if (!trimmed) return null;
  const key = normalizeKey(trimmed);
  return (
    categories.find((c) => normalizeKey(c.name) === key) ??
    categories.find((c) => normalizeKey(c.slug) === key) ??
    null
  );
}

/**
 * Preview match (D135/D141): set category_id when category_name matches an
 * existing category and mirror the canonical DB name. Does not create
 * categories (create only on Finalizar). No semantic remap.
 */
export function applyCategoryMatchToDraft(
  draft: IntakeDraftItem,
  categories: CategoryOptionLike[],
): IntakeDraftItem {
  if (draft.category_id) {
    const byId = categories.find((c) => c.id === draft.category_id);
    if (byId && draft.category_name !== byId.name) {
      return { ...draft, category_name: byId.name };
    }
    return draft;
  }
  const matched = matchCategoryByName(categories, draft.category_name);
  if (!matched) return draft;
  return {
    ...draft,
    category_id: matched.id,
    category_name: matched.name,
  };
}

export type PublishGateResult = {
  ok: boolean;
  reasons: string[];
};

/**
 * Gate for "Publicar no catálogo" switch (D135):
 * price > 0 + name + size_label + photo + no validator conflicts.
 */
export function evaluatePublishGate(draft: {
  name: string;
  price: number | string | null;
  size_label: string;
  images: Array<{ image_url: string }>;
  hasConflict: boolean;
}): PublishGateResult {
  const reasons: string[] = [];
  const name = draft.name.trim();
  if (name.length < 2) reasons.push("Nome incompleto");

  const price =
    typeof draft.price === "string"
      ? Number(draft.price.replace(",", "."))
      : draft.price;
  if (!(typeof price === "number" && Number.isFinite(price) && price > 0)) {
    reasons.push("Preço pendente");
  }

  if (!draft.size_label.trim()) reasons.push("Tamanho pendente");
  if (!draft.images[0]?.image_url) reasons.push("Foto pendente");
  if (draft.hasConflict) reasons.push("Conflito de validação");

  return { ok: reasons.length === 0, reasons };
}
