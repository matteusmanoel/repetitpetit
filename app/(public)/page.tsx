import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function Home() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center gap-8 px-4 py-12 text-center sm:px-8 sm:py-20">
      <Badge variant="destructive" className="h-auto px-3 py-1 text-sm">
        Peça única — corre antes que acabe!
      </Badge>

      <h1 className="font-heading text-3xl font-extrabold text-foreground sm:text-5xl">
        Roupinhas com história para novas aventuras
      </h1>

      <p className="text-base text-muted-foreground sm:text-lg">
        A Repeti Petit está de casa nova por aqui. Em breve você vai poder
        escolher o tamanho, reservar a peça e finalizar a compra sem precisar
        falar com ninguém.
      </p>

      <div className="flex w-full flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <Button size="lg" className="h-11 w-full sm:w-auto">
          Ver catálogo em breve
        </Button>
        <Button
          variant="secondary"
          size="lg"
          className="h-11 w-full sm:w-auto"
        >
          Seguir no Instagram
        </Button>
      </div>

      <div className="mt-4 flex w-full max-w-sm flex-col gap-2 rounded-lg border border-border bg-card p-4 text-left sm:flex-row sm:items-center">
        <Input
          type="email"
          placeholder="seuemail@exemplo.com"
          aria-label="E-mail"
          className="h-11 sm:flex-1"
        />
        <Button variant="outline" className="h-11 w-full sm:w-auto">
          Avise-me no lançamento
        </Button>
      </div>
    </div>
  );
}
