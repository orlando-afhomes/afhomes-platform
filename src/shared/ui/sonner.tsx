"use client"

import { CircleCheck, CircleX, Info, LoaderCircle, TriangleAlert } from "lucide-react"
import { Toaster as Sonner, type ToasterProps } from "sonner"

// Each kind of notice has its own icon and tint, so success, error, warning and
// information read differently at a glance. The text stays dark for contrast. Class names are
// written out in full because Tailwind cannot find names built from variables.
const KIND_CLASSES = {
  success: "tw:bg-[color-mix(in_oklch,var(--color-success),white_92%)]!",
  error: "tw:bg-[color-mix(in_oklch,var(--color-danger),white_92%)]!",
  warning: "tw:bg-[color-mix(in_oklch,var(--color-warning),white_92%)]!",
  info: "tw:bg-[color-mix(in_oklch,var(--color-info),white_92%)]!",
} as const

/**
 * Corporate toast host. Light theme only (no dark mode in the current design
 * system), colored through the shadcn variables that resolve to tokens.css.
 * Mount once per migrated panel layout; it renders nothing until a toast is raised.
 * Errors and warnings stay longer than successes (Sonner has no per-kind default, so
 * callers that need it pass `duration`).
 */
function Toaster({ ...props }: ToasterProps) {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      closeButton
      duration={5000}
      icons={{
        success: <CircleCheck aria-hidden="true" className="tw:size-5 tw:text-[var(--color-success)]" />,
        error: <CircleX aria-hidden="true" className="tw:size-5 tw:text-destructive" />,
        warning: <TriangleAlert aria-hidden="true" className="tw:size-5 tw:text-[var(--color-warning)]" />,
        info: <Info aria-hidden="true" className="tw:size-5 tw:text-[var(--color-info)]" />,
        loading: <LoaderCircle aria-hidden="true" className="tw:size-5 tw:animate-spin tw:text-muted-foreground" />,
      }}
      toastOptions={{
        classNames: {
          toast: "tw:rounded-xl! tw:shadow-lg!",
          title: "tw:font-semibold!",
          description: "tw:text-muted-foreground!",
          ...KIND_CLASSES,
        },
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
