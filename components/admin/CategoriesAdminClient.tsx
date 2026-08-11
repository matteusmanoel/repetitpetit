"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { CategoryForm } from "@/components/admin/CategoryForm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  createCategoryAction,
  deleteCategoryAction,
  updateCategoryAction,
} from "@/features/categories/actions";
import type { Category } from "@/features/categories/data";

export function CategoriesAdminClient({
  categories,
}: {
  categories: Category[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function openCreate() {
    setEditing(null);
    setOpen(true);
  }

  function openEdit(category: Category) {
    setEditing(category);
    setOpen(true);
  }

  function handleDelete(category: Category) {
    if (!window.confirm(`Excluir a categoria “${category.name}”?`)) return;
    setDeletingId(category.id);
    startTransition(async () => {
      await deleteCategoryAction(category.id);
      setDeletingId(null);
      router.refresh();
    });
  }

  const boundUpdate = editing
    ? updateCategoryAction.bind(null, editing.id)
    : createCategoryAction;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-foreground">
            Categorias
          </h1>
          <p className="text-sm text-muted-foreground">
            Organize a vitrine. Categorias ativas com ordem menor aparecem
            primeiro.
          </p>
        </div>
        <Button type="button" className="h-12 rounded-xl px-4 text-base" onClick={openCreate}>
          Nova categoria
        </Button>
      </div>

      {categories.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border px-4 py-10 text-center">
          <p className="text-sm text-muted-foreground">
            Nenhuma categoria cadastrada ainda.
          </p>
          <Button type="button" className="mt-4" onClick={openCreate}>
            Criar primeira categoria
          </Button>
        </div>
      ) : (
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
                    <span className="text-[10px] text-muted-foreground">
                      sem img
                    </span>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-medium text-foreground">
                      {category.name}
                    </p>
                    <Badge
                      variant={category.is_active ? "default" : "secondary"}
                    >
                      {category.is_active ? "Ativa" : "Inativa"}
                    </Badge>
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    /{category.slug} · ordem {category.sort_order}
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-12 rounded-xl px-4 text-base"
                  onClick={() => openEdit(category)}
                >
                  Editar
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  className="h-12 rounded-xl px-4 text-base"
                  disabled={isPending && deletingId === category.id}
                  onClick={() => handleDelete(category)}
                >
                  {deletingId === category.id ? "Excluindo…" : "Excluir"}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Editar categoria" : "Nova categoria"}
            </DialogTitle>
          </DialogHeader>
          {open ? (
            <CategoryForm
              key={editing?.id ?? "new"}
              category={editing ?? undefined}
              action={boundUpdate}
              submitLabel={editing ? "Salvar" : "Criar categoria"}
              onSuccess={() => setOpen(false)}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
