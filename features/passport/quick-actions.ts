import type { ProductStatus } from "@/features/admin/product-constants";
import type {
  PassportInventoryStatus,
  PassportQuickAction,
} from "@/features/passport/types";

/**
 * Status-dependent quick actions for Garment Passport (SN-11 / D73).
 * Pure — no I/O. Override / Sell targets are completed by SN-13 / SN-08.
 */
export function getPassportQuickActions(
  status: ProductStatus,
): PassportQuickAction[] {
  switch (status as PassportInventoryStatus | ProductStatus) {
    case "available":
      return [
        { id: "sell", label: "Vender", variant: "default" },
        { id: "edit", label: "Editar", variant: "outline" },
        { id: "archive", label: "Arquivar", variant: "destructive" },
      ];
    case "hold":
      return [
        { id: "override", label: "Override", variant: "default" },
        { id: "sell", label: "Vender (após override)", variant: "secondary" },
        { id: "edit", label: "Editar", variant: "outline" },
        { id: "view_hold", label: "Ver hold", variant: "outline" },
      ];
    case "sold":
      return [
        { id: "view_sale", label: "Ver venda", variant: "default" },
        { id: "reprint", label: "Reimprimir", variant: "outline" },
      ];
    case "inactive":
      return [
        { id: "reactivate", label: "Reativar", variant: "default" },
        { id: "edit", label: "Editar", variant: "outline" },
      ];
    default:
      // reserved (legado) — edição + reprint only; no Sell.
      return [
        { id: "edit", label: "Editar", variant: "outline" },
        { id: "reprint", label: "Reimprimir", variant: "outline" },
      ];
  }
}

export function isPassportInventoryStatus(
  status: ProductStatus,
): status is PassportInventoryStatus {
  return (
    status === "available" ||
    status === "hold" ||
    status === "sold" ||
    status === "inactive"
  );
}
