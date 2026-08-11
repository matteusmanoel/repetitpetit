import { redirect } from "next/navigation";

type Props = {
  params: Promise<{ id: string }>;
};

/**
 * Edição pontual via dialog na listagem (`?edit=`) — D144.
 */
export default async function AdminProductEditRedirectPage({ params }: Props) {
  const { id } = await params;
  redirect(`/admin/produtos?edit=${encodeURIComponent(id)}`);
}
