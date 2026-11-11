import { cn } from "@/shared/lib/utils"

/**
 * Loading placeholder. Uses the design-system skeleton tone (visible on the
 * page background), a soft shimmer, and a short fade-in delay so loads under
 * ~150 ms never flash a skeleton. Decorative: announce loading with the
 * surrounding region (`aria-busy` + a status message), not here.
 */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden="true"
      className={cn("ui-skeleton tw:rounded-md", className)}
      {...props}
    />
  )
}

export { Skeleton }
