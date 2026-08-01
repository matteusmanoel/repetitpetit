import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function ProductNotFound() {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-col items-center gap-4 px-4 py-16 text-center">
      <h1 className="font-heading text-2xl font-extrabold text-foreground">
        Peça não encontrada
      </h1>
      <p className="text-sm text-muted-foreground sm:text-base">
        Essa peça pode ter sido vendida ou não está mais disponível no catálogo.
      </p>
      <Button asChild className="rounded-full">
        <Link href="/catalogo">Ver catálogo</Link>
      </Button>
    </div>
  );
}
