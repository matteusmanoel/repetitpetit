"use client";

import { ShoppingBag } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import { Button } from "@/components/ui/button";
import { useCartStore } from "@/features/cart/store";
import { cn } from "@/lib/utils";

type CartTriggerProps = {
  className?: string;
};

/**
 * Botão do header que abre o `CartSheet` com badge de quantidade.
 */
export function CartTrigger({ className }: CartTriggerProps) {
  const openCart = useCartStore((s) => s.openCart);
  const itemCount = useCartStore((s) => s.items.length);
  const hasHydrated = useCartStore((s) => s.hasHydrated);

  const count = hasHydrated ? itemCount : 0;

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn("relative size-11", className)}
      aria-label={
        count > 0
          ? `Abrir carrinho, ${count} ${count === 1 ? "peça" : "peças"}`
          : "Abrir carrinho"
      }
      onClick={openCart}
    >
      <ShoppingBag className="size-5" />
      <AnimatePresence>
        {count > 0 ? (
          <motion.span
            key={count}
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.4, opacity: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            className="absolute top-1.5 right-1.5 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground"
          >
            {count > 9 ? "9+" : count}
          </motion.span>
        ) : null}
      </AnimatePresence>
    </Button>
  );
}
