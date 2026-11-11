import { LoaderCircle } from "lucide-react"
import { cn } from "@/shared/lib/utils"

/** Inline loading spinner. Pass `label` when it is the only loading signal. */
function Spinner({ className, label, ...props }: React.ComponentProps<"svg"> & { label?: string }) {
  return (
    <LoaderCircle
      data-slot="spinner"
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? "status" : undefined}
      className={cn("tw:size-4 tw:animate-spin tw:motion-reduce:animate-none", className)}
      {...props}
    />
  )
}

export { Spinner }
