import { redirect } from "next/navigation";

/** SS-9: CRUD via modal na listagem — rota legada redireciona. */
export default function LegacyEditBannerPage() {
  redirect("/admin/banners");
}
