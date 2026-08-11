import Link from "next/link";

import { CategoryDeleteButton } from "@/components/admin/CategoryDeleteButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Category } from "@/features/categories/data";

export function CategoryList({ categories }: { categories: Category[] }) {
  if (categories.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border px-4 py-10 text-center">
        <p className="text-sm text-muted-foreground">
          Nenhuma categoria cadastrada ainda.
        </p>
        <Button asChild className="mt-4">
          <Link href="/admin/categorias/nova">Criar primeira categoria</Link>
        </Button>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-border rounded-lg border border-border">
      {categories.map((category) => (
        <li
          key={category.id}
          className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
              {category.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={category.image_url}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-[10px] text-muted-foreground">sem img</span>
              )}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate font-medium text-foreground">{category.name}</p>
                <Badge variant={category.is_active ? "default" : "secondary"}>
                  {category.is_active ? "Ativa" : "Inativa"}
                </Badge>
              </div>
              <p className="truncate text-xs text-muted-foreground">
                /{category.slug} · ordem {category.sort_order}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 gap-2">
            <Button asChild variant="outline" className="h-12 rounded-xl px-4 text-base">
              <Link href={`/admin/categorias/${category.id}`}>Editar</Link>
            </Button>
            <CategoryDeleteButton id={category.id} name={category.name} />
          </div>
        </li>
      ))}
    </ul>
  );
}
