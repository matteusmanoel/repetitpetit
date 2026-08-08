import { redirect } from "next/navigation";

export default function LegacyEditCategoryPage() {
  redirect("/admin/categorias");
}
