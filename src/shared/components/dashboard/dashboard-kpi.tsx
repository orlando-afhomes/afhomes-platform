import type { ReactNode } from "react";
import { ArrowDown, ArrowUp, type LucideIcon } from "lucide-react";
import { formatChange, type KpiComparison } from "@/modules/reports/kpi-comparison";
import { Skeleton } from "@/shared/ui/skeleton";
import { cn } from "@/shared/lib/utils";
import { DASHBOARD_TONE_CLASSES, DASHBOARD_TONE_COLORS, type DashboardTone } from "./dashboard-layout";

/** KPI row: one column on mobile, two on tablet, and up to four on wide screens. */
export function DashboardKpiGrid({ children, columns = 4 }: { children: ReactNode; columns?: number }) {
  const wide =
    columns >= 4 ? "tw:xl:grid-cols-4" : columns === 3 ? "tw:xl:grid-cols-3" : columns === 2 ? "tw:xl:grid-cols-2" : undefined;
  return <div className={cn("tw:grid tw:grid-cols-1 tw:gap-4 tw:xl:gap-5", columns > 1 ? "tw:sm:grid-cols-2" : undefined, wide)}>{children}</div>;
}

/** A period KPI's comparison with the immediately preceding period of equal length (doc 11 section 32). */
export type DashboardKpiTrend = {
  result: KpiComparison;
  /** Human-readable previous period, for example "Sep 14, 2026 to Oct 12, 2026". */
  previousLabel: string;
};

const PILL = "tw:inline-flex tw:items-center tw:gap-0.5 tw:rounded-full tw:px-2 tw:py-0.5 tw:text-xs tw:font-semibold tw:whitespace-nowrap";
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
    const Arrow = result.direction === "up" ? ArrowUp : result.direction === "down" ? ArrowDown : null;
    const tone =
      result.direction === "up"
        ? "tw:bg-success/10 tw:text-[var(--color-success-strong)]"
        : result.direction === "down"
          ? "tw:bg-destructive/10 tw:text-destructive"
          : NEUTRAL_PILL;
    const word = result.direction === "up" ? "Up" : result.direction === "down" ? "Down" : "No change";
    pill = (
      <span className={cn(PILL, tone)}>
        {Arrow ? <Arrow aria-hidden="true" className="tw:size-3" strokeWidth={2.5} /> : null}
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

/** Faint decorative wave in the card corner. It carries no data. */
function CornerWave({ tone }: { tone: DashboardTone }) {
  const color = DASHBOARD_TONE_COLORS[tone];
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 200 100"
      preserveAspectRatio="none"
      className="tw:pointer-events-none tw:absolute tw:right-0 tw:bottom-0 tw:h-3/5 tw:w-3/5"
    >
      <path d="M0 100 C 50 92, 80 40, 130 46 C 165 50, 180 22, 200 8 L 200 100 Z" fill={color} opacity={0.06} />
      <path d="M40 100 C 80 90, 110 62, 150 64 C 175 65, 190 48, 200 38 L 200 100 Z" fill={color} opacity={0.06} />
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
    <div className="tw:@container tw:relative tw:h-full tw:overflow-hidden tw:rounded-2xl tw:border tw:border-border tw:bg-card tw:p-5 tw:text-card-foreground tw:shadow-(--shadow-soft)">
      <CornerWave tone={tone} />
      <div className="tw:relative tw:flex tw:flex-col tw:gap-3 tw:@[16rem]:flex-row tw:@[16rem]:items-start tw:@[16rem]:gap-4">
      <span aria-hidden="true" className={cn("tw:flex tw:size-12 tw:shrink-0 tw:items-center tw:justify-center tw:rounded-xl", DASHBOARD_TONE_CLASSES[tone])}>
        <Icon className="tw:size-6" strokeWidth={1.75} />
      </span>
      <dl className="tw:m-0 tw:min-w-0 tw:flex-1">
        <dt className="tw:text-sm tw:font-medium tw:text-foreground">{label}</dt>
        <dd className="tw:m-0 tw:mt-1.5 tw:text-2xl tw:leading-tight tw:font-bold tw:tracking-tight tw:tabular-nums tw:break-words tw:@[19rem]:text-[1.75rem]">
          {loading ? (
            <Skeleton className="tw:h-8 tw:w-28" />
          ) : error ? (
            <span className="tw:text-base tw:font-medium tw:text-muted-foreground">Unavailable</span>
          ) : (
            value
          )}
        </dd>
        <dd className="tw:m-0 tw:mt-3 tw:flex tw:flex-wrap tw:items-center tw:gap-x-2 tw:gap-y-1 tw:text-xs">
          {ready && trend ? <TrendPill trend={trend} scope={scope} /> : <span className={cn(PILL, NEUTRAL_PILL)}>{scope}</span>}
        </dd>
        {description && ready ? <dd className="tw:m-0 tw:mt-2 tw:text-xs tw:text-muted-foreground">{description}</dd> : null}
      </dl>
      </div>
    </div>
  );
}
