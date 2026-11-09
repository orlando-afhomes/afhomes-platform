import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"
import { cn } from "@/shared/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "tw:h-10 tw:w-full tw:min-w-0 tw:rounded-lg tw:border tw:border-input tw:bg-card tw:px-3 tw:py-1 tw:text-base tw:shadow-(--shadow-soft) tw:transition-[border-color,box-shadow] tw:outline-none tw:hover:border-foreground/30 tw:file:mr-3 tw:file:inline-flex tw:file:h-7 tw:file:rounded-md tw:file:bg-muted tw:file:px-2.5 tw:file:border-0 tw:file:text-sm tw:file:font-medium tw:file:text-foreground tw:placeholder:text-muted-foreground tw:focus-visible:border-ring tw:focus-visible:ring-3 tw:focus-visible:ring-ring/30 tw:disabled:pointer-events-none tw:disabled:cursor-not-allowed tw:disabled:bg-input/50 tw:disabled:opacity-50 tw:aria-invalid:border-destructive tw:aria-invalid:ring-3 tw:aria-invalid:ring-destructive/20 tw:md:text-sm tw:dark:bg-input/30 tw:dark:disabled:bg-input/80 tw:dark:aria-invalid:border-destructive/50 tw:dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
}

export { Input }
