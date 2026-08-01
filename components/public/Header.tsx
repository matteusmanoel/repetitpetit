import Image from "next/image";
import Link from "next/link";
import { env } from "@/lib/env";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/brand/logo.png"
            alt={env.NEXT_PUBLIC_STORE_NAME}
            width={140}
            height={44}
            priority
            className="h-10 w-auto"
          />
        </Link>
        <nav className="flex items-center gap-4 text-sm font-medium">
          <Link href="/catalogo" className="text-primary hover:underline">
            Catálogo
          </Link>
          <Link
            href="/desapegue"
            className="text-muted-foreground hover:text-foreground"
          >
            Desapegue
          </Link>
        </nav>
      </div>
    </header>
  );
}
