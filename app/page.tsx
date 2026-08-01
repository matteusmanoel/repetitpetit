import Image from "next/image";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b border-border bg-card px-4 py-3 sm:px-8">
        <Image
          src="/brand/logo.png"
          alt="Repeti Petit"
          width={335}
          height={597}
          priority
          className="h-12 w-auto sm:h-14"
        />
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm">
              Menu
            </Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Repeti Petit</SheetTitle>
              <SheetDescription>
                O catálogo, o carrinho e o checkout chegam nas próximas
                etapas. Por enquanto, este é só o esqueleto da loja.
              </SheetDescription>
            </SheetHeader>
          </SheetContent>
        </Sheet>
      </header>

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center gap-8 px-4 py-12 text-center sm:px-8 sm:py-20">
        <Badge variant="destructive" className="h-auto px-3 py-1 text-sm">
          Peça única — corre antes que acabe!
        </Badge>

        <h1 className="font-heading text-3xl font-extrabold text-foreground sm:text-5xl">
          Roupinhas com história para novas aventuras
        </h1>

        <p className="text-base text-muted-foreground sm:text-lg">
          A Repeti Petit está de casa nova por aqui. Em breve você vai poder
          escolher o tamanho, reservar a peça e finalizar a compra sem
          precisar falar com ninguém.
        </p>

        <div className="flex w-full flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Button size="lg" className="w-full sm:w-auto">
            Ver catálogo em breve
          </Button>
          <Button variant="secondary" size="lg" className="w-full sm:w-auto">
            Seguir no Instagram
          </Button>
        </div>

        <div className="mt-4 flex w-full max-w-sm flex-col gap-2 rounded-lg border border-border bg-card p-4 text-left sm:flex-row sm:items-center">
          <Input
            type="email"
            placeholder="seuemail@exemplo.com"
            aria-label="E-mail"
            className="sm:flex-1"
          />
          <Button variant="outline" className="w-full sm:w-auto">
            Avise-me no lançamento
          </Button>
        </div>
      </main>

      <footer className="border-t border-border px-4 py-6 text-center text-sm text-muted-foreground sm:px-8">
        Repeti Petit · Av. República Argentina, 2554 · Foz do Iguaçu, PR
      </footer>
    </div>
  );
}
