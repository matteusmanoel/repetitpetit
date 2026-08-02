import { conditionLabel, genderLabel } from "@/features/catalog/labels";
import type { ProductDetail } from "@/features/catalog/types";
import { CONDITION_PILL_CLASS, GENDER_PILL_CLASS } from "@/features/catalog/ui-tokens";
import { cn } from "@/lib/utils";

type ProductAttributesProps = {
  product: Pick<ProductDetail, "brand" | "size_label" | "condition" | "gender">;
};

/**
 * Atributos da PDP como pills horizontais scrolláveis (T6) — marca e tamanho
 * neutros, condição e gênero coloridos pelos tokens de `ui-tokens.ts`.
 */
export function ProductAttributes({ product }: ProductAttributesProps) {
  const pills: { key: string; label: string; className: string }[] = [];

  const brand = product.brand?.trim();
  if (brand) {
    pills.push({ key: "brand", label: brand, className: "bg-muted text-foreground" });
  }

  pills.push({
    key: "size",
    label: product.size_label,
    className: "bg-muted text-foreground",
  });
  pills.push({
    key: "condition",
    label: conditionLabel(product.condition),
    className: CONDITION_PILL_CLASS[product.condition],
  });
  pills.push({
    key: "gender",
    label: genderLabel(product.gender),
    className: GENDER_PILL_CLASS[product.gender],
  });

  return (
    <ul
      aria-label="Atributos do produto"
      className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] sm:-mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden"
    >
      {pills.map((pill) => (
        <li
          key={pill.key}
          className={cn(
            "inline-flex h-9 shrink-0 items-center whitespace-nowrap rounded-full px-3.5 text-sm font-medium",
            pill.className,
          )}
        >
          {pill.label}
        </li>
      ))}
    </ul>
  );
}
