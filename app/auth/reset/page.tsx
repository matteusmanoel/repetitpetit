import type { Metadata } from "next";

import { ResetPasswordForm } from "@/components/admin/ResetPasswordForm";

export const metadata: Metadata = {
  title: "Redefinir senha — Repeti Petit Admin",
};

export default function ResetPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted px-4 py-12">
      <div className="w-full max-w-sm">
        <ResetPasswordForm />
      </div>
    </main>
  );
}
