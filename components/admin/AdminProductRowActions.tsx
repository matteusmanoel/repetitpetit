"use client";

import { MoreHorizontalIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

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
import {
  activateProductAction,
  deactivateProductAction,
} from "@/features/admin/product-actions";

type Props = {
  productId: string;
  productName: string;
  status: string;
  staffCode: string | null;
};

/**
 * Ações da linha da tabela de produtos (T8 / SN-09) — `DropdownMenu` em vez de um
 * botão solto por ação; "Desativar" abre `Dialog` de confirmação (sem
 * `window.confirm` nativo). "Ativar peça" atribui RP-… uma vez.
 */
export function AdminProductRowActions({
  productId,
  productName,
  status,
  staffCode,
}: Props) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [isActivating, setIsActivating] = useState(false);

  const canActivate =
    !staffCode && (status === "available" || status === "inactive");

  async function handleActivate() {
    setIsActivating(true);
    try {
      const result = await activateProductAction(productId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Peça ativada: ${result.staffCode}`);
      router.refresh();
    } finally {
      setIsActivating(false);
    }
  }

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
      <div className="flex items-center justify-end gap-1">
        {canActivate ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isActivating}
            onClick={() => void handleActivate()}
          >
            {isActivating ? "Ativando..." : "Ativar peça"}
          </Button>
        ) : null}

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
            {staffCode ? (
              <DropdownMenuItem disabled title="Etiqueta/QR em SN-10">
                Reimprimir
              </DropdownMenuItem>
            ) : null}
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
      </div>

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
