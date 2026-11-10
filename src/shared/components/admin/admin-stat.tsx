"use client";

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Skeleton } from "@/shared/ui/skeleton";
import { cn } from "@/shared/lib/utils";
import { AdminKpiGrid } from "./admin-primitives";

/** Compact stat grid: same responsive columns as the KPI grid, for operational pages. */
export function AdminStatGrid({ children, columns = 4 }: { children: ReactNode; columns?: number }) {
  return <AdminKpiGrid columns={columns}>{children}</AdminKpiGrid>;
}

/**
 * Compact operational stat tone. Each tone carries one fixed meaning so color
 * is never decorative. Dashboard KPI cards keep their own larger design.
 */
export type AdminStatTone =
  | "brand"
  | "info"
  | "accent"
  | "violet"
  | "soft"
  | "success"
  | "warning"
  | "danger"
  | "neutral";

const STAT_TONE_CLASSES: Record<AdminStatTone, string> = {
  brand: "tw:bg-[var(--color-brand-soft)] tw:text-primary",
  info: "tw:bg-info/10 tw:text-info",
  accent: "tw:bg-[var(--color-accent-soft)] tw:text-[var(--color-accent-strong)]",
  violet: "tw:bg-[var(--color-dashboard-violet-soft)] tw:text-[var(--color-dashboard-violet)]",
  soft: "tw:bg-primary/10 tw:text-primary",
  success: "tw:bg-success/10 tw:text-[var(--color-success-strong)]",
  warning: "tw:bg-warning/10 tw:text-[var(--color-warning-strong)]",
  danger: "tw:bg-destructive/10 tw:text-destructive",
  neutral: "tw:bg-muted tw:text-muted-foreground",
};

const STAT_TONE_BAR: Record<AdminStatTone, string> = {
  brand: "var(--color-brand-primary)",
  info: "var(--color-info)",
  accent: "var(--color-accent)",
  violet: "var(--color-dashboard-violet)",
  soft: "var(--color-brand-secondary)",
  success: "var(--color-success)",
  warning: "var(--color-warning)",
  danger: "var(--color-danger)",
  neutral: "var(--color-border-strong)",
};

/** Faint decorative wave in the card corner, tinted per tone. It carries no data. */
function StatWave({ tone }: { tone: AdminStatTone }) {
  const color = STAT_TONE_BAR[tone];
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 200 100"
      preserveAspectRatio="none"
      className="tw:pointer-events-none tw:absolute tw:right-0 tw:bottom-0 tw:h-3/5 tw:w-3/5"
    >
      <path d="M0 100 C 50 92, 80 40, 130 46 C 165 50, 180 22, 200 8 L 200 100 Z" fill={color} opacity={0.08} />
      <path d="M40 100 C 80 90, 110 62, 150 64 C 175 65, 190 48, 200 38 L 200 100 Z" fill={color} opacity={0.08} />
    </svg>
  );
}

/**
 * Compact stat card for operational pages (reference:
 * docs/ui-redesign/card-for-all-pages.png): icon chip, tone divider, and a
 * large value under a small label, over a faint tone-tinted wave. Smaller and
 * plainer than dashboard KPI cards: no comparison pills, no trends.
 */
export function AdminStatCard({
  label,
  value,
  icon: Icon,
  tone = "brand",
  description,
  loading = false,
  error = null,
}: {
  label: string;
  value: ReactNode;
  icon: LucideIcon;
  tone?: AdminStatTone;
  /** Muted caption under the value; renders only when provided. */
  description?: ReactNode;
  loading?: boolean;
  error?: unknown;
}) {
  return (
    <div className="tw:relative tw:h-full tw:overflow-hidden tw:rounded-2xl tw:border tw:border-border tw:bg-card tw:p-5 tw:text-card-foreground tw:shadow-(--shadow-soft)">
      <StatWave tone={tone} />
      <div className="tw:relative tw:flex tw:items-center tw:gap-4">
        <span aria-hidden="true" className={cn("tw:flex tw:size-11 tw:shrink-0 tw:items-center tw:justify-center tw:rounded-xl", STAT_TONE_CLASSES[tone])}>
          <Icon className="tw:size-5" strokeWidth={1.75} />
        </span>
        <span aria-hidden="true" className="tw:w-0.5 tw:shrink-0 tw:self-stretch tw:rounded-full" style={{ backgroundColor: STAT_TONE_BAR[tone] }} />
        <dl className="tw:m-0 tw:min-w-0 tw:flex-1">
          <dt className="tw:text-sm tw:font-medium tw:text-muted-foreground">{label}</dt>
          <dd className="tw:m-0 tw:mt-1 tw:text-3xl tw:leading-none tw:font-bold tw:tracking-tight tw:tabular-nums tw:break-words">
            {loading ? (
              <Skeleton className="tw:h-8 tw:w-24" />
            ) : error ? (
              <span className="tw:text-base tw:font-medium tw:text-muted-foreground">Unavailable</span>
            ) : (
              value
            )}
          </dd>
          {description && !loading && !error ? (
            <dd className="tw:m-0 tw:mt-1.5 tw:text-xs tw:text-muted-foreground">{description}</dd>
          ) : null}
        </dl>
      </div>
    </div>
  );
}
