import { requireAdminSession } from "@/features/admin/session";
import { buildProductsXlsxTemplate } from "@/lib/imports/products-xlsx";

/**
 * GET — baixa o template XLSX (admin autenticado).
 * Mantém `xlsx` só no server e evita inflar o bundle do client.
 */
export async function GET() {
  await requireAdminSession();

  const buffer = buildProductsXlsxTemplate();

  return new Response(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition":
        'attachment; filename="repeti-petit-produtos-template.xlsx"',
      "Cache-Control": "no-store",
    },
  });
}
