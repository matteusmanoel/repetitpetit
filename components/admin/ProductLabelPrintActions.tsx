"use client";

import { Button } from "@/components/ui/button";

type Props = {
  pdfHref: string;
};

/**
 * Client actions for the HTML label page — thermal `window.print` + PDF tab.
 */
export function ProductLabelPrintActions({ pdfHref }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        size="sm"
        onClick={() => {
          window.print();
        }}
      >
        Imprimir
      </Button>
      <Button type="button" variant="outline" size="sm" asChild>
        <a href={pdfHref} target="_blank" rel="noopener noreferrer">
          Baixar PDF
        </a>
      </Button>
    </div>
  );
}
