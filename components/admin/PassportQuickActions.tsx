"use client";

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
  activateProductAction,
  deactivateProductAction,
} from "@/features/admin/product-actions";
import type { PassportQuickAction } from "@/features/passport/types";
import {
  overridePath,
  posSellPath,
  productEditPath,
  productLabelPdfPath,
} from "@/lib/qr/passport-url";

type Props = {
  productId: string;
  productName: string;
  actions: PassportQuickAction[];
};

/**
 * Full-width mobile CTAs for Garment Passport (SN-11).
 * Mutations reuse SN-09 activate / admin deactivate; Sell/Override are stubs.
 */
export function PassportQuickActions({
  productId,
  productName,
  actions,
}: Props) {
  const router = useRouter();
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [busy, setBusy] = useState<"archive" | "reactivate" | null>(null);

  async function handleArchive() {
    setBusy("archive");
    try {
      await deactivateProductAction(productId);
    } finally {
      setBusy(null);
      setArchiveOpen(false);
    }
  }

  async function handleReactivate() {
    setBusy("reactivate");
    try {
      const result = await activateProductAction(productId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Peça reativada: ${result.staffCode}`);
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <div className="flex w-full flex-col gap-2">
        {actions.map((action) => {
          const className = "h-11 w-full min-h-11 justify-center text-base";

          switch (action.id) {
            case "sell":
              return (
                <Button
                  key={action.id}
                  asChild
                  variant={action.variant}
                  className={className}
                >
                  <Link href={posSellPath(productId)}>{action.label}</Link>
                </Button>
              );
            case "edit":
              return (
                <Button
                  key={action.id}
                  asChild
                  variant={action.variant}
                  className={className}
                >
                  <Link href={productEditPath(productId)}>{action.label}</Link>
                </Button>
              );
            case "archive":
              return (
                <Button
                  key={action.id}
                  type="button"
                  variant={action.variant}
                  className={className}
                  disabled={busy !== null}
                  onClick={() => setArchiveOpen(true)}
                >
                  {action.label}
                </Button>
              );
            case "override":
              return (
                <Button
                  key={action.id}
                  asChild
                  variant={action.variant}
                  className={className}
                >
                  <Link href={overridePath(productId)}>{action.label}</Link>
                </Button>
              );
            case "view_hold":
              return (
                <Button
                  key={action.id}
                  asChild
                  variant={action.variant}
                  className={className}
                >
                  <a href="#passport-hold">{action.label}</a>
                </Button>
              );
            case "view_sale":
              return (
                <Button
                  key={action.id}
                  asChild
                  variant={action.variant}
                  className={className}
                >
                  <a href="#passport-sale">{action.label}</a>
                </Button>
              );
            case "reprint":
              return (
                <Button
                  key={action.id}
                  asChild
                  variant={action.variant}
                  className={className}
                >
                  <a
                    href={productLabelPdfPath(productId)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {action.label}
                  </a>
                </Button>
              );
            case "reactivate":
              return (
                <Button
                  key={action.id}
                  type="button"
                  variant={action.variant}
                  className={className}
                  disabled={busy !== null}
                  onClick={() => void handleReactivate()}
                >
                  {busy === "reactivate" ? "Reativando…" : action.label}
                </Button>
              );
            default:
              return null;
          }
        })}
      </div>

      <Dialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Arquivar &ldquo;{productName}&rdquo;?</DialogTitle>
            <DialogDescription>
              A peça fica inativa e some do catálogo. O código RP permanece — você
              pode reativar depois pelo Passaporte.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy !== null}
              onClick={() => setArchiveOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={busy !== null}
              onClick={() => void handleArchive()}
            >
              {busy === "archive" ? "Arquivando…" : "Arquivar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
