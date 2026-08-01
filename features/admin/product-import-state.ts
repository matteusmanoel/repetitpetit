import type { ProductImportRowError } from "@/lib/imports/products-xlsx";

export type ProductImportSummary = {
  importId: string;
  fileName: string;
  totalRows: number;
  importedRows: number;
  failedRows: number;
  errors: ProductImportRowError[];
};

export type ProductImportActionState = {
  error?: string;
  summary?: ProductImportSummary;
};

export const initialProductImportActionState: ProductImportActionState = {};
