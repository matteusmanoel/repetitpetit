"use client";

import { MoreHorizontalIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { deactivateProductAction } from "@/features/admin/product-actions";

type Props = {
  productId: string;
  productName: string;
  status: string;
};

/**
 * Ações da linha da tabela de produtos (T8) — `DropdownMenu` em vez de um
 * botão solto por ação; "Desativar" abre `Dialog` de confirmação (sem
 * `window.confirm` nativo).
 */
export function AdminProductRowActions({ productId, productName, status }: Props) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);

  async function handleDeactivate() {
    setIsDeactivating(true);
    try {
      await deactivateProductAction(productId);
    } finally {
      setIsDeactivating(false);
      setConfirmOpen(false);
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={`Ações de ${productName}`}
          >
            <MoreHorizontalIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href={`/admin/produtos/${productId}`}>Editar</Link>
          </DropdownMenuItem>
          {status !== "inactive" ? (
            <DropdownMenuItem
              variant="destructive"
              onSelect={(event) => {
                event.preventDefault();
                setConfirmOpen(true);
              }}
            >
              Desativar
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Desativar &ldquo;{productName}&rdquo;?</DialogTitle>
            <DialogDescription>
              A peça some do catálogo público, mas os dados continuam salvos — reative
              trocando o status depois, se precisar.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isDeactivating}
              onClick={() => setConfirmOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={isDeactivating}
              onClick={() => void handleDeactivate()}
            >
              {isDeactivating ? "Desativando..." : "Desativar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
