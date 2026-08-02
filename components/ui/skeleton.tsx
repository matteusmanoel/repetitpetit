import { cn } from "@/lib/utils"

function Skeleton({
  className,
  shimmer = false,
  ...props
}: React.ComponentProps<"div"> & {
  /** Sweep de brilho em vez do `animate-pulse` padrão — opt-in, loja apenas. */
  shimmer?: boolean
}) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        "rounded-md bg-muted",
        shimmer
          ? "relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:bg-linear-to-r before:from-transparent before:via-white/50 before:to-transparent before:animate-shimmer"
          : "animate-pulse",
        className,
      )}
      {...props}
    />
  )
}

export { Skeleton }
