import { Button } from "@/components/ui/button";
import { signOutAction } from "@/features/admin/sign-out-action";

/**
 * Server Component — o `<form action={...}>` chama a server action
 * diretamente, sem precisar de `"use client"` nem de JS no browser.
 */
export function SignOutButton() {
  return (
    <form action={signOutAction}>
      <Button type="submit" variant="outline" size="sm">
        Sair
      </Button>
    </form>
  );
}
