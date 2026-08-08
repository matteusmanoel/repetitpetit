import { redirect } from "next/navigation";

export default function LegacyNewCategoryPage() {
  redirect("/admin/categorias");
}
