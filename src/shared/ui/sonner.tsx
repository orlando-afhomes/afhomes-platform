"use client"

import { Toaster as Sonner, type ToasterProps } from "sonner"

/**
 * Corporate toast host. Light theme only (no dark mode in the current design
 * system), colored through the shadcn variables that resolve to tokens.css.
 * Mount once per migrated panel layout; it renders nothing until a toast is raised.
 */
function Toaster({ ...props }: ToasterProps) {
  return (
    <Sonner
      theme="light"
      className="toaster group"
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
