"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";
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

const VALUE_MAX_PX = 30;
const VALUE_MIN_PX = 12;

/** Font size (px) that makes a value needing `needed` px at the maximum size fit `available` px. */
export function fitValueSize(available: number, needed: number, max = VALUE_MAX_PX, min = VALUE_MIN_PX): number {
  if (available <= 0 || needed <= 0 || needed <= available) return max;
  // 2% margin: a subpixel overflow would still trigger the ellipsis.
  return Math.max(min, Math.floor((max * available * 98) / needed) / 100);
}

/** Shrinks its text to fit the card width, so long amounts are never clipped. */
function FitValue({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  const fit = () => {
    const el = ref.current;
    if (!el) return;
    el.style.fontSize = `${VALUE_MAX_PX}px`;
    const available = el.clientWidth;
    const needed = el.scrollWidth;
    const size = fitValueSize(available, needed);
    el.style.fontSize = `${size}px`;
    // At the floor the text may still be cut; the title keeps the full value readable.
    el.title = size <= VALUE_MIN_PX && needed * (size / VALUE_MAX_PX) > available ? (el.textContent ?? "") : "";
  };
  useLayoutEffect(fit);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(fit);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return (
    <dd ref={ref} data-fit-value className="tw:m-0 tw:mt-1 tw:min-w-0 tw:truncate tw:text-3xl tw:leading-none tw:font-bold tw:tracking-tight tw:tabular-nums">
      {children}
    </dd>
  );
}

/**
 * Compact stat card for operational pages (reference:
 * docs/ui-redesign/card-for-all-pages.png): icon chip, tone divider, and a
 * large value under a small label, over a faint tone-tinted wave. Smaller and
 * plainer than dashboard KPI cards: no comparison pills, no trends.
 * The card sizes by its own width (container queries): a narrow card stacks the
 * chip above the text, and a long value shrinks instead of clipping.
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
  /** Muted caption under the value; renders only when provided. Keep to two words. */
  description?: ReactNode;
  loading?: boolean;
  error?: unknown;
}) {
  return (
    <div className="tw:@container tw:relative tw:h-full tw:min-w-0 tw:overflow-hidden tw:rounded-2xl tw:border tw:border-border tw:bg-card tw:p-4 tw:text-card-foreground tw:shadow-(--shadow-soft) tw:sm:p-5">
      <StatWave tone={tone} />
      <div className="tw:relative tw:flex tw:flex-col tw:gap-3 tw:@[14rem]:flex-row tw:@[14rem]:items-center tw:@[14rem]:gap-4">
        <span aria-hidden="true" className={cn("tw:flex tw:size-10 tw:shrink-0 tw:items-center tw:justify-center tw:rounded-xl tw:@[14rem]:size-11", STAT_TONE_CLASSES[tone])}>
          <Icon className="tw:size-5" strokeWidth={1.75} />
        </span>
        <span aria-hidden="true" className="tw:hidden tw:w-0.5 tw:shrink-0 tw:self-stretch tw:rounded-full tw:@[14rem]:block" style={{ backgroundColor: STAT_TONE_BAR[tone] }} />
        <dl className="tw:m-0 tw:min-w-0 tw:flex-1">
          <dt className="tw:line-clamp-2 tw:text-sm tw:font-medium tw:text-muted-foreground">{label}</dt>
          {loading ? (
            <dd className="tw:m-0 tw:mt-1 tw:leading-none">
              <Skeleton className="tw:h-8 tw:w-24 tw:max-w-full" />
            </dd>
          ) : error ? (
            <dd className="tw:m-0 tw:mt-1 tw:text-base tw:leading-none tw:font-medium tw:text-muted-foreground">Unavailable</dd>
          ) : (
            <FitValue>{value}</FitValue>
          )}
          {description && !loading && !error ? (
            <dd className="tw:m-0 tw:mt-1.5 tw:truncate tw:text-xs tw:text-muted-foreground">{description}</dd>
          ) : null}
        </dl>
      </div>
    </div>
  );
}
