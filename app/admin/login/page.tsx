import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AdminLoginForm } from "@/components/admin/AdminLoginForm";
import { getAdminSession } from "@/features/admin/session";

export const metadata: Metadata = {
  title: "Entrar — Repeti Petit Admin",
};

export default async function AdminLoginPage() {
  const session = await getAdminSession();

  if (session) {
    redirect("/admin");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted px-4 py-12">
      <div className="w-full max-w-sm">
        <AdminLoginForm />
      </div>
    </main>
  );
}
