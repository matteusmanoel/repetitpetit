import { FEATURED_BRANDS } from "@/features/storefront/nav";

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
