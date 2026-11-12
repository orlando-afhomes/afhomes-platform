import { useId, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/shared/lib/utils";

/** Icon chip tones shared by every dashboard card; colors come from the brand tokens. */
export type DashboardTone = "brand" | "info" | "accent" | "violet" | "soft";

export const DASHBOARD_TONE_CLASSES: Record<DashboardTone, string> = {
  brand: "tw:bg-[var(--color-brand-soft)] tw:text-primary",
  info: "tw:bg-info/10 tw:text-info",
  accent: "tw:bg-[var(--color-accent-soft)] tw:text-[var(--color-accent-strong)]",
  violet: "tw:bg-[var(--color-dashboard-violet-soft)] tw:text-[var(--color-dashboard-violet)]",
  soft: "tw:bg-primary/10 tw:text-primary",
};

/** The tone's solid color, used for decorative accents such as the KPI corner wave. */
export const DASHBOARD_TONE_COLORS: Record<DashboardTone, string> = {
  brand: "var(--color-brand-primary)",
  info: "var(--color-info)",
  accent: "var(--color-accent)",
  violet: "var(--color-dashboard-violet)",
  soft: "var(--color-brand-secondary)",
};

/** Dashboard heading: large title, short description, and an optional control such as the date filter. */
export function DashboardHeader({ title, description, actions }: { title: string; description: string; actions?: ReactNode }) {
  return (
    <div className="tw:mt-1 tw:flex tw:flex-col tw:gap-4 tw:sm:flex-row tw:sm:items-start tw:sm:justify-between">
      <div className="tw:min-w-0">
        <h1 className="tw:text-[1.75rem] tw:leading-tight tw:font-bold tw:tracking-tight tw:text-foreground">{title}</h1>
        <p className="tw:mt-1.5 tw:text-sm tw:text-muted-foreground">{description}</p>
      </div>
      {actions ? <div className="tw:flex tw:shrink-0 tw:flex-wrap tw:items-center tw:gap-2">{actions}</div> : null}
    </div>
  );
}

/** Dashboard card: white surface, large radius, soft shadow, icon + title + subtitle header. */
export function DashboardCard({
  title,
  description,
  icon: Icon,
  actions,
  children,
  className,
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const id = useId();
  const titleId = `${id}-title`;
  const descriptionId = `${id}-description`;
  return (
    // Named by its visible heading and described by its subtitle, so the region's accessible name never drifts from the screen.
    <section
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      className={cn(
        "tw:flex tw:h-full tw:min-w-0 tw:flex-col tw:rounded-2xl tw:border tw:border-border tw:bg-card tw:p-5 tw:text-card-foreground tw:shadow-(--shadow-soft) tw:sm:p-6",
        className,
      )}
    >
      <div className="tw:flex tw:flex-wrap tw:items-start tw:gap-x-3 tw:gap-y-3">
        {Icon ? <Icon aria-hidden="true" className="tw:mt-0.5 tw:size-6 tw:shrink-0 tw:text-primary" strokeWidth={1.75} /> : null}
        {/* A 14rem basis lets the actions wrap below the title on narrow cards instead of squeezing it. */}
        <div className="tw:min-w-0 tw:flex-[1_1_14rem]">
          <h2 id={titleId} className="tw:text-lg tw:leading-snug tw:font-semibold tw:text-foreground">
            {title}
          </h2>
          {description ? (
            <p id={descriptionId} className="tw:mt-0.5 tw:text-sm tw:text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? <div className="tw:flex tw:shrink-0 tw:flex-wrap tw:items-center tw:gap-2">{actions}</div> : null}
      </div>
      <div className="tw:mt-5 tw:flex tw:min-w-0 tw:flex-1 tw:flex-col">{children}</div>
    </section>
  );
}

const SPLIT = {
  "3-2": {
    lg: { grid: "tw:lg:grid-cols-5", primary: "tw:lg:col-span-3", secondary: "tw:lg:col-span-2" },
    xl: { grid: "tw:xl:grid-cols-5", primary: "tw:xl:col-span-3", secondary: "tw:xl:col-span-2" },
  },
  "1-1": {
    lg: { grid: "tw:lg:grid-cols-2", primary: undefined, secondary: undefined },
    xl: { grid: "tw:xl:grid-cols-2", primary: undefined, secondary: undefined },
  },
} as const;

/**
 * Two-panel dashboard row, stacked below the breakpoint. `3-2` gives the first
 * panel three fifths; `1-1` splits evenly. A missing panel lets the other take the full width.
 */
export function DashboardSplit({
  primary,
  secondary,
  at = "xl",
  ratio = "3-2",
}: {
  primary?: ReactNode;
  secondary?: ReactNode;
  at?: "lg" | "xl";
  ratio?: "3-2" | "1-1";
}) {
  if (!primary && !secondary) return null;
  const both = Boolean(primary && secondary);
  const layout = SPLIT[ratio][at];
  return (
    <div className={cn("tw:grid tw:gap-6", both ? layout.grid : undefined)}>
      {primary ? <div className={cn("tw:min-w-0", both ? layout.primary : undefined)}>{primary}</div> : null}
      {secondary ? <div className={cn("tw:min-w-0", both ? layout.secondary : undefined)}>{secondary}</div> : null}
    </div>
  );
}

/** Truthful empty state inside a dashboard card. */
export function DashboardEmptyState({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p
      className={cn(
        "tw:flex tw:min-h-32 tw:flex-1 tw:items-center tw:justify-center tw:rounded-xl tw:border tw:border-dashed tw:border-border tw:px-4 tw:py-6 tw:text-center tw:text-sm tw:text-muted-foreground",
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
