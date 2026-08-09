import type {
  ProductCondition,
  ProductGender,
  SizeGroup,
} from "@/features/admin/product-constants";

/** Campos preenchíveis a partir de Áudio → Processar no dialog de produto. */
export type ProductAudioFieldSuggestion = {
  name: string;
  description: string;
  price: number;
  brand: string;
  size_label: string;
  size_group: SizeGroup;
  gender: ProductGender;
  condition: ProductCondition;
};

/**
 * Fallback mock-gated (sem IA / falha de provider) — espelha o protótipo
 * Admin Ops UX. O operador pode editar tudo antes de salvar.
 */
export function buildMockAudioFieldSuggestions(
  audioNote?: string | null,
): ProductAudioFieldSuggestion {
  const note = audioNote?.trim();
  return {
    name: "Conjunto moletom infantil",
    price: 89,
    size_label: "M",
    brand: "Hering Kids",
    size_group: "4_5a",
    gender: "unissex",
    condition: "seminovo",
    description: note
      ? `Peça em ótimo estado. Nota: ${note}`
      : "Peça em ótimo estado. Tecido macio, sem manchas. Gerado a partir do áudio (fallback).",
  };
}
