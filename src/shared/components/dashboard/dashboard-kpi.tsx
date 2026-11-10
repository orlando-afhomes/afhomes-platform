import type { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";
import { formatChange, type KpiComparison } from "@/modules/reports/kpi-comparison";
import { Skeleton } from "@/shared/ui/skeleton";
import { cn } from "@/shared/lib/utils";
import { DASHBOARD_TONE_CLASSES, DASHBOARD_TONE_COLORS, type DashboardTone } from "./dashboard-layout";

/** KPI row: one column on mobile, two on tablet, and up to four on wide screens. */
export function DashboardKpiGrid({ children, columns = 4 }: { children: ReactNode; columns?: number }) {
  const wide =
    columns >= 4 ? "tw:xl:grid-cols-4" : columns === 3 ? "tw:xl:grid-cols-3" : columns === 2 ? "tw:xl:grid-cols-2" : undefined;
  return <div className={cn("tw:grid tw:grid-cols-1 tw:gap-5 tw:xl:gap-6", columns > 1 ? "tw:sm:grid-cols-2" : undefined, wide)}>{children}</div>;
}

/** A period KPI's comparison with the immediately preceding period of equal length (doc 11 section 32). */
export type DashboardKpiTrend = {
  result: KpiComparison;
  /** Human-readable previous period, for example "Sep 14, 2026 to Oct 12, 2026". */
  previousLabel: string;
};

const PILL = "tw:inline-flex tw:items-center tw:gap-1 tw:rounded-full tw:px-3 tw:py-1 tw:text-[0.8125rem] tw:leading-none tw:font-semibold tw:whitespace-nowrap";
const NEUTRAL_PILL = "tw:bg-muted tw:text-muted-foreground";

function TrendPill({ trend, scope }: { trend: DashboardKpiTrend; scope: string }) {
  const { result, previousLabel } = trend;
  if (result.kind === "none") {
    return <span className={cn(PILL, NEUTRAL_PILL, "tw:font-medium")}>No comparison available</span>;
  }
  const compared = `compared with ${previousLabel}`;
  let pill: ReactNode;
  if (result.kind === "new") {
    pill = (
      <span className={cn(PILL, NEUTRAL_PILL)}>
        New<span className="tw:sr-only">: no activity in the previous period, {compared}</span>
      </span>
    );
  } else {
    // Higher is better for every compared KPI, so up is green and down is red; no change stays neutral.
    // Diagonal arrows match the dashboard reference (north-east for growth, south-east for decline).
    const Arrow = result.direction === "up" ? ArrowUpRight : result.direction === "down" ? ArrowDownRight : null;
    const tone =
      result.direction === "up"
        ? "tw:bg-success/10 tw:text-[var(--color-success-strong)]"
        : result.direction === "down"
          ? "tw:bg-destructive/10 tw:text-destructive"
          : NEUTRAL_PILL;
    const word = result.direction === "up" ? "Up" : result.direction === "down" ? "Down" : "No change";
    pill = (
      <span className={cn(PILL, tone)}>
        {Arrow ? <Arrow aria-hidden="true" className="tw:size-3.5" strokeWidth={2.5} /> : null}
        <span aria-hidden="true">{formatChange(result.percentTenths)}</span>
        <span className="tw:sr-only">
          {word} {formatChange(Math.abs(result.percentTenths))} {compared}
        </span>
      </span>
    );
  }
  return (
    <>
      {pill}
      <span className="tw:text-muted-foreground">
        <span className="tw:sr-only">{scope}, </span>vs. previous period
      </span>
    </>
  );
}

/** Faint decorative wave washing the card's bottom-right corner. It carries no data. */
function CornerWave({ tone }: { tone: DashboardTone }) {
  const color = DASHBOARD_TONE_COLORS[tone];
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 200 100"
      preserveAspectRatio="none"
      className="tw:pointer-events-none tw:absolute tw:right-0 tw:bottom-0 tw:h-2/3 tw:w-3/5"
    >
      <path d="M0 100 C 45 96, 75 78, 115 62 C 145 50, 170 42, 200 44 L 200 100 Z" fill={color} opacity={0.1} />
      <path d="M45 100 C 85 94, 115 80, 150 74 C 172 70, 188 60, 200 56 L 200 100 Z" fill={color} opacity={0.12} />
    </svg>
  );
}

/**
 * One KPI. Period KPIs pass a `trend`; snapshot KPIs show a neutral "Current"
 * pill and never a percentage (doc 13 section 3.1, doc 11 section 32).
 * Values are formatted by the caller.
 */
export function DashboardKpiCard({
  label,
  value,
  icon: Icon,
  tone = "brand",
  scope,
  trend,
  description,
  loading = false,
  error = null,
}: {
  label: string;
  value: ReactNode;
  icon: LucideIcon;
  tone?: DashboardTone;
  /** "Current" for a snapshot, or the selected period label for a period KPI. */
  scope: string;
  trend?: DashboardKpiTrend;
  /** Business-critical note only, for example a net amount or an overdue balance. */
  description?: ReactNode;
  loading?: boolean;
  error?: unknown;
}) {
  const ready = !loading && !error;
  return (
    // Container queries size the card by its own width, so a narrow column stacks the chip and shrinks the value instead of clipping it.
    <div className="tw:@container tw:relative tw:h-full tw:overflow-hidden tw:rounded-[1.25rem] tw:border tw:border-border tw:bg-card tw:p-5 tw:text-card-foreground tw:shadow-(--shadow-soft) tw:sm:p-6">
      <CornerWave tone={tone} />
      <div className="tw:relative tw:flex tw:flex-col tw:gap-3 tw:@[16rem]:flex-row tw:@[16rem]:items-start tw:@[16rem]:gap-4">
      <span aria-hidden="true" className={cn("tw:flex tw:size-14 tw:shrink-0 tw:items-center tw:justify-center tw:rounded-2xl", DASHBOARD_TONE_CLASSES[tone])}>
        <Icon className="tw:size-7" strokeWidth={1.5} />
      </span>
      <dl className="tw:m-0 tw:min-w-0 tw:flex-1">
        <dt className="tw:text-[0.9375rem] tw:font-medium tw:text-muted-foreground">{label}</dt>
        <dd className="tw:m-0 tw:mt-1 tw:text-[1.75rem] tw:leading-[1.15] tw:font-bold tw:tracking-tight tw:tabular-nums tw:break-words tw:@[19rem]:text-[2rem]">
          {loading ? (
            <Skeleton className="tw:h-8 tw:w-28" />
          ) : error ? (
            <span className="tw:text-base tw:font-medium tw:text-muted-foreground">Unavailable</span>
          ) : (
            value
          )}
        </dd>
        <dd className="tw:m-0 tw:mt-4 tw:flex tw:flex-wrap tw:items-center tw:gap-x-2 tw:gap-y-1 tw:text-[0.8125rem]">
          {ready && trend ? <TrendPill trend={trend} scope={scope} /> : <span className={cn(PILL, NEUTRAL_PILL)}>{scope}</span>}
        </dd>
        {description && ready ? <dd className="tw:m-0 tw:mt-2 tw:text-xs tw:text-muted-foreground">{description}</dd> : null}
      </dl>
      </div>
    </div>
  );
}
