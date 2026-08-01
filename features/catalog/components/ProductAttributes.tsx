import { conditionLabel, genderLabel } from "@/features/catalog/labels";
import type { ProductDetail } from "@/features/catalog/types";

type ProductAttributesProps = {
  product: Pick<ProductDetail, "brand" | "size_label" | "condition" | "gender">;
};

/** Atributos estruturados da PDP: marca, tamanho, condição, gênero. */
export function ProductAttributes({ product }: ProductAttributesProps) {
  const rows = [
    { label: "Marca", value: product.brand?.trim() || "—" },
    { label: "Tamanho", value: product.size_label },
    { label: "Condição", value: conditionLabel(product.condition) },
    { label: "Gênero", value: genderLabel(product.gender) },
  ] as const;

  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
      {rows.map((row) => (
        <div key={row.label} className="flex flex-col gap-0.5">
          <dt className="text-xs text-muted-foreground">{row.label}</dt>
          <dd className="text-sm font-medium text-foreground">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}
