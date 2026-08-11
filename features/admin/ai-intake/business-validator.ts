import type { SizeGroup } from "@/features/admin/product-constants";
import type { ProductSizeLabel } from "@/features/admin/product-constants";
import { isProductSizeLabel } from "@/features/admin/product-constants";
import type { IntakeDraftItem } from "@/features/admin/ai-intake/schemas";

export type IntakeValidationIssue = {
  code: "size_age_conflict";
  message: string;
};

/**
 * RN incompatible with toddler+ age bands (D135 quality pass).
 * Baby month bands remain allowed with RN.
 */
const RN_INCOMPATIBLE_GROUPS = new Set<SizeGroup>([
  "2_3a",
  "4_5a",
  "6_8a",
  "9_12a",
  "13_mais",
]);

const BABY_GROUPS = new Set<SizeGroup>(["rn_3m", "3_6m", "6_12m"]);

/**
 * Deterministic business checks after LLM merge.
 * Conflicts block Publicar, not Finalizar (D135).
 */
export function validateIntakeDraft(
  draft: Pick<IntakeDraftItem, "size_label" | "size_group">,
): IntakeValidationIssue[] {
  const issues: IntakeValidationIssue[] = [];
  const label = draft.size_label?.trim();
  const group = draft.size_group;

  if (label && isProductSizeLabel(label) && group) {
    if (label === "RN" && RN_INCOMPATIBLE_GROUPS.has(group)) {
      issues.push({
        code: "size_age_conflict",
        message: `Conflito: tamanho RN com faixa ${group}.`,
      });
    }
    if (
      (label === "G" as ProductSizeLabel) &&
      BABY_GROUPS.has(group) &&
      group === "rn_3m"
    ) {
      issues.push({
        code: "size_age_conflict",
        message: `Conflito: tamanho G com faixa RN a 3 meses.`,
      });
    }
  }

  return issues;
}

export function draftHasValidationConflicts(
  draft: Pick<IntakeDraftItem, "size_label" | "size_group">,
): boolean {
  return validateIntakeDraft(draft).length > 0;
}
