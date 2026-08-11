import { redirect } from "next/navigation";

/**
 * Cadastro pontual via dialog na listagem; lote via Em massa (D144 / D142).
 */
export default function AdminProductNewRedirectPage() {
  redirect("/admin/produtos/intake-ia");
}
