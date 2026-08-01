import type { ReactNode } from "react";

import { SiteFooter } from "@/components/public/site-footer";
import { SiteHeader } from "@/components/public/site-header";
import { WhatsAppFab } from "@/components/public/whatsapp-fab";
import { env } from "@/lib/env";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex flex-1 flex-col">{children}</main>
      <SiteFooter />
      <WhatsAppFab whatsappNumber={env.NEXT_PUBLIC_STORE_WHATSAPP} />
    </div>
  );
}
