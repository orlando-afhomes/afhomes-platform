import type { ReactNode } from "react";
import { cn } from "@/shared/lib/utils";

/** Icon chip tones shared by every dashboard card; colors come from the brand tokens. */
export type DashboardTone = "brand" | "accent" | "info" | "soft";

export const DASHBOARD_TONE_CLASSES: Record<DashboardTone, string> = {
  brand: "tw:bg-secondary tw:text-primary",
  accent: "tw:bg-accent tw:text-[var(--color-accent-strong)]",
  info: "tw:bg-info/10 tw:text-info",
  soft: "tw:bg-primary/10 tw:text-primary",
};

const SPLIT = {
  lg: { grid: "tw:lg:grid-cols-5", primary: "tw:lg:col-span-3", secondary: "tw:lg:col-span-2" },
  xl: { grid: "tw:xl:grid-cols-5", primary: "tw:xl:col-span-3", secondary: "tw:xl:col-span-2" },
} as const;

/**
 * Two-panel dashboard row: 3/5 and 2/5 from the breakpoint up, stacked below it.
 * A missing panel lets the other take the full width.
 */
export function DashboardSplit({ primary, secondary, at = "xl" }: { primary?: ReactNode; secondary?: ReactNode; at?: "lg" | "xl" }) {
  if (!primary && !secondary) return null;
  const both = Boolean(primary && secondary);
  return (
    <div className={cn("tw:grid tw:gap-6", both ? SPLIT[at].grid : undefined)}>
      {primary ? <div className={cn("tw:min-w-0", both ? SPLIT[at].primary : undefined)}>{primary}</div> : null}
      {secondary ? <div className={cn("tw:min-w-0", both ? SPLIT[at].secondary : undefined)}>{secondary}</div> : null}
    </div>
  );
}

/** Truthful empty state inside a dashboard card. */
export function DashboardEmptyState({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p
      className={cn(
        "tw:flex tw:min-h-32 tw:items-center tw:justify-center tw:rounded-lg tw:border tw:border-dashed tw:border-border tw:px-4 tw:py-6 tw:text-center tw:text-sm tw:text-muted-foreground",
        className,
      )}
    >
      {children}
    </p>
  );
}

/** Load error inside a dashboard card. */
export function DashboardError({ error, fallback }: { error: unknown; fallback: string }) {
  return (
    <p role="alert" className="tw:rounded-lg tw:border tw:border-destructive/40 tw:p-4 tw:text-sm tw:text-destructive">
      {error instanceof Error ? error.message : fallback}
    </p>
  );
}
