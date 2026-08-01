import Link from "next/link";

export default function PedidoNotFound() {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <h1 className="font-heading text-2xl font-extrabold text-foreground">
        Pedido não encontrado
      </h1>
      <p className="text-sm text-muted-foreground">
        Confira o código ou fale com a loja pelo WhatsApp.
      </p>
      <Link
        href="/catalogo"
        className="inline-flex h-11 items-center justify-center rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground"
      >
        Ver catálogo
      </Link>
    </div>
  );
}
