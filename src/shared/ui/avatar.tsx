"use client"

import { Avatar as AvatarPrimitive } from "@base-ui/react/avatar"
import { cn } from "@/shared/lib/utils"

function Avatar({ className, ...props }: AvatarPrimitive.Root.Props) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      className={cn(
        "tw:relative tw:inline-flex tw:size-10 tw:shrink-0 tw:items-center tw:justify-center tw:overflow-hidden tw:rounded-full tw:bg-muted tw:text-sm tw:font-medium tw:text-muted-foreground tw:select-none",
        className
      )}
      {...props}
    />
  )
}

function AvatarImage({ className, ...props }: AvatarPrimitive.Image.Props) {
  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      className={cn("tw:size-full tw:object-cover", className)}
      {...props}
    />
  )
}

function AvatarFallback({ className, ...props }: AvatarPrimitive.Fallback.Props) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn("tw:flex tw:size-full tw:items-center tw:justify-center", className)}
      {...props}
    />
  )
}

export { Avatar, AvatarImage, AvatarFallback }
