"use client"

import * as React from "react"
import { Combobox as ComboboxPrimitive } from "@base-ui/react/combobox"
import { CheckIcon, ChevronDownIcon } from "lucide-react"
import { cn } from "@/shared/lib/utils"

const Combobox = ComboboxPrimitive.Root

function ComboboxInput({ className, ...props }: ComboboxPrimitive.Input.Props) {
  return (
    <div className="tw:relative tw:flex tw:w-full">
      <ComboboxPrimitive.Input
        data-slot="combobox-input"
        className={cn(
          "tw:h-10 tw:w-full tw:min-w-0 tw:rounded-lg tw:border tw:border-input tw:bg-transparent tw:py-1 tw:pr-8 tw:pl-2.5 tw:text-sm tw:transition-colors tw:outline-none tw:placeholder:text-muted-foreground tw:focus-visible:border-ring tw:focus-visible:ring-3 tw:focus-visible:ring-ring/50 tw:disabled:cursor-not-allowed tw:disabled:opacity-50 tw:aria-invalid:border-destructive tw:aria-invalid:ring-3 tw:aria-invalid:ring-destructive/20 tw:sm:h-8",
          className
        )}
        {...props}
      />
      <ComboboxPrimitive.Trigger
        data-slot="combobox-trigger"
        aria-label="Show options"
        className="tw:absolute tw:top-1/2 tw:right-1 tw:flex tw:size-7 tw:-translate-y-1/2 tw:items-center tw:justify-center tw:text-muted-foreground"
      >
        <ChevronDownIcon aria-hidden="true" className="tw:size-4" />
      </ComboboxPrimitive.Trigger>
    </div>
  )
}

function ComboboxContent({ className, children, ...props }: ComboboxPrimitive.Popup.Props) {
  return (
    <ComboboxPrimitive.Portal>
      <ComboboxPrimitive.Positioner sideOffset={4} className="tw:isolate tw:z-50">
        <ComboboxPrimitive.Popup
          data-slot="combobox-content"
          className={cn(
            "tw:max-h-72 tw:w-(--anchor-width) tw:min-w-36 tw:overflow-y-auto tw:rounded-lg tw:bg-popover tw:p-1 tw:text-popover-foreground tw:shadow-md tw:ring-1 tw:ring-foreground/10",
            className
          )}
          {...props}
        >
          {children}
        </ComboboxPrimitive.Popup>
      </ComboboxPrimitive.Positioner>
    </ComboboxPrimitive.Portal>
  )
}

const ComboboxList = ComboboxPrimitive.List

function ComboboxEmpty({ className, ...props }: ComboboxPrimitive.Empty.Props) {
  return (
    <ComboboxPrimitive.Empty
      data-slot="combobox-empty"
      className={cn("tw:px-2 tw:py-2 tw:text-sm tw:text-muted-foreground tw:empty:hidden", className)}
      {...props}
    />
  )
}

function ComboboxItem({ className, children, ...props }: ComboboxPrimitive.Item.Props) {
  return (
    <ComboboxPrimitive.Item
      data-slot="combobox-item"
      className={cn(
        "tw:relative tw:flex tw:min-h-11 tw:w-full tw:cursor-default tw:items-center tw:gap-1.5 tw:rounded-md tw:py-1.5 tw:pr-8 tw:pl-2 tw:text-sm tw:outline-hidden tw:select-none tw:data-highlighted:bg-accent tw:data-highlighted:text-accent-foreground tw:data-disabled:pointer-events-none tw:data-disabled:opacity-50 tw:sm:min-h-8",
        className
      )}
      {...props}
    >
      {children}
      <ComboboxPrimitive.ItemIndicator className="tw:absolute tw:right-2 tw:flex tw:items-center">
        <CheckIcon aria-hidden="true" className="tw:size-4" />
      </ComboboxPrimitive.ItemIndicator>
    </ComboboxPrimitive.Item>
  )
}

export { Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList }
