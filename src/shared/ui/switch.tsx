"use client"

import { Switch as SwitchPrimitive } from "@base-ui/react/switch"
import { cn } from "@/shared/lib/utils"

export type SwitchProps = {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  disabled?: boolean
  "aria-label"?: string
  className?: string
}

/**
 * Accessible toggle switch (Base UI Switch root + thumb). Controlled: the
 * owner passes `checked` and applies `onCheckedChange`.
 * Knob math: 44px track (w-11) − 20px knob (size-5) − 2px inset
 * (translate-x-0.5) = 22px checked offset.
 */
function Switch({ className, ...props }: SwitchProps) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "tw:inline-flex tw:h-6 tw:w-11 tw:shrink-0 tw:cursor-pointer tw:items-center tw:rounded-full tw:bg-muted tw:transition-colors tw:outline-none tw:focus-visible:border-ring tw:focus-visible:ring-3 tw:focus-visible:ring-ring/50 tw:data-checked:bg-primary tw:data-disabled:cursor-not-allowed tw:data-disabled:opacity-50",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="tw:block tw:size-5 tw:translate-x-0.5 tw:rounded-full tw:bg-card tw:shadow tw:transition-transform tw:data-checked:translate-x-[22px]"
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
