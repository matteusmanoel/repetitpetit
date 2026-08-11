"use client";

import { useState } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PRODUCT_STATUS_LABELS,
  PRODUCT_STATUSES,
} from "@/features/admin/product-constants";

type Props = {
  name: string;
  defaultValue: string;
};

/**
 * Filtro de status da listagem de produtos (T8) — `Select` shadcn no lugar do
 * `<select>` cru, com hidden input para manter a submissão GET nativa do
 * formulário de busca (`app/admin/(protected)/produtos/page.tsx`).
 */
export function AdminProductStatusFilter({ name, defaultValue }: Props) {
  const [value, setValue] = useState(defaultValue);

  return (
    <>
      <input type="hidden" name={name} value={value} />
      <Select
        value={value}
        onValueChange={(next) => {
          if (next) setValue(next);
        }}
      >
        <SelectTrigger className="h-12 w-full rounded-2xl text-base data-[size=default]:h-12">
          <SelectValue placeholder="Selecione" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          {PRODUCT_STATUSES.map((s) => (
            <SelectItem key={s} value={s}>
              {PRODUCT_STATUS_LABELS[s]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  );
}
