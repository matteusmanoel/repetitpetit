import type { ReactNode } from "react";

import { BottomBar } from "@/components/public/bottom-bar";
import { SiteFooter } from "@/components/public/site-footer";
import { SiteHeader } from "@/components/public/site-header";
import { WhatsAppFab } from "@/components/public/whatsapp-fab";
import { Toaster } from "@/components/ui/sonner";
import { CartSheet } from "@/features/cart/components/CartSheet";
import { publicEnv } from "@/lib/env/public";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col pb-24 md:pb-0">
      <SiteHeader />
      <main className="flex flex-1 flex-col">{children}</main>
      <SiteFooter />
      <CartSheet />
      <BottomBar />
      <Toaster position="top-center" richColors closeButton />
      <WhatsAppFab whatsappNumber={publicEnv.NEXT_PUBLIC_STORE_WHATSAPP} />
    </div>
  );
}
