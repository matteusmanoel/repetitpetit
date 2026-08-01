import { MapPin } from "lucide-react";

const SOCIAL_LINKS = [
  {
    href: "https://instagram.com/repetipetit",
    label: "Instagram @repetipetit",
    handle: "@repetipetit",
  },
  {
    href: "https://instagram.com/repetipetit_",
    label: "Instagram @repetipetit_",
    handle: "@repetipetit_",
  },
] as const;

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-start sm:justify-between sm:px-8">
        <div className="flex flex-col gap-2">
          <p className="font-heading text-lg font-bold text-foreground">
            Repeti Petit
          </p>
          <p className="text-sm text-muted-foreground">
            Brechó infantil — compra, venda e troca de roupas, calçados e
            acessórios seminovos.
          </p>
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>Av. República Argentina, 2554 · Foz do Iguaçu, PR</span>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-foreground">
            Siga a gente
          </p>
          <ul className="flex flex-col gap-1">
            {SOCIAL_LINKS.map((social) => (
              <li key={social.href}>
                <a
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center gap-2 py-1 text-sm text-muted-foreground transition-colors hover:text-primary"
                >
                  <InstagramIcon className="size-4 shrink-0" />
                  {social.handle}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-border px-4 py-4 text-center text-xs text-muted-foreground sm:px-8">
        © {new Date().getFullYear()} Repeti Petit. Todos os direitos
        reservados.
      </div>
    </footer>
  );
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}
