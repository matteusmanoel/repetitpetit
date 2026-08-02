import type { Metadata } from "next";

import { DesapegueForm } from "@/components/public/desapegue-form";
import { env } from "@/lib/env";

export const metadata: Metadata = {
  title: "Desapegue conosco",
  description:
    "Venda ou troque roupinhas infantis com a Repeti Petit em poucos passos.",
};

export default function DesapeguePage() {
  return (
    <div className="mx-auto w-full max-w-xl flex-1 px-4 py-8 sm:px-8 sm:py-12">
      <DesapegueForm storeName={env.NEXT_PUBLIC_STORE_NAME} />
    </div>
  );
}
