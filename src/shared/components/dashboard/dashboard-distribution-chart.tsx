import type { LucideIcon } from "lucide-react";
import { Money } from "@/shared/components/modern/money";
import { Skeleton } from "@/shared/ui/skeleton";
import { formatShare } from "./dashboard-chart-model";
import { DashboardCard, DashboardEmptyState, DashboardError } from "./dashboard-layout";

export type DistributionRow = {
  key: string;
  label: string;
  /** Short qualifier such as a tier code. */
  detail?: string;
  count: number;
  /** A CSS color, normally a brand token. */
  color: string;
  /** Optional money amount for the row, in centavos. */
  amountCentavos?: number;
};

/** Visual gap between donut segments, in percent of the ring. */
const SEGMENT_GAP = 0.8;

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Donut and legend for a small set of categories counted from authorized records. */
export function DashboardDistributionChart({
  title,
  description,
  icon,
  rows,
  unit,
  loading,
  error,
  emptyText,
}: {
  title: string;
  description: string;
  icon?: LucideIcon;
  rows: readonly DistributionRow[];
  /** Singular and plural nouns for the center total, for example ["contract", "contracts"]. */
  unit: readonly [string, string];
  loading: boolean;
  error: unknown;
  emptyText: string;
}) {
  const total = rows.reduce((sum, row) => sum + row.count, 0);
  const shareOf = (count: number) => (total === 0 ? 0 : (count / total) * 100);
  const filled = rows.filter((row) => row.count > 0).length;
  const gap = filled > 1 ? SEGMENT_GAP : 0;
  const segments = rows.map((row, index) => ({
    ...row,
    share: shareOf(row.count),
    offset: rows.slice(0, index).reduce((sum, previous) => sum + shareOf(previous.count), 0),
  }));
  const noun = (count: number) => (count === 1 ? unit[0] : unit[1]);
  // Full summary for assistive technology, e.g. "Contracts by VIP Product: 4 contracts. VIP Gold: 1 contract, 25%."
  const ariaLabel = [
    `${title}: ${total} ${noun(total)}.`,
    ...rows.map((row) => `${row.label}: ${row.count} ${noun(row.count)}, ${formatShare(row.count, total)}.`),
  ].join(" ");

  return (
    <DashboardCard title={title} description={description} icon={icon}>
      {loading ? (
        <Skeleton className="tw:h-52 tw:w-full" />
      ) : error ? (
        <DashboardError error={error} fallback="Could not load this distribution." />
      ) : total === 0 ? (
        <DashboardEmptyState>{emptyText}</DashboardEmptyState>
      ) : (
        // Side by side only when the card itself is wide enough for the legend; stacked otherwise.
        <div className="tw:@container tw:flex tw:flex-1 tw:items-center">
        <div className="tw:flex tw:w-full tw:flex-col tw:items-center tw:gap-6 tw:@[28rem]:flex-row tw:@[28rem]:gap-8">
          <div className="tw:relative tw:flex tw:size-48 tw:shrink-0 tw:items-center tw:justify-center">
            <svg role="img" aria-label={ariaLabel} viewBox="0 0 42 42" className="tw:size-full tw:-rotate-90">
              <circle cx="21" cy="21" r="15.9155" fill="none" stroke="var(--color-bg-sunken)" strokeWidth="6.5" />
              {segments.map((segment) =>
                segment.share > 0 ? (
                  <circle
                    key={segment.key}
                    cx="21"
                    cy="21"
                    r="15.9155"
                    fill="none"
                    pathLength={100}
                    stroke={segment.color}
                    strokeWidth="6.5"
                    strokeDasharray={`${Math.max(segment.share - gap, 0.1)} ${100 - Math.max(segment.share - gap, 0.1)}`}
                    strokeDashoffset={-segment.offset}
                  />
                ) : null,
              )}
            </svg>
            <div aria-hidden="true" className="tw:absolute tw:flex tw:flex-col tw:items-center tw:justify-center tw:text-center">
              <span className="tw:text-[2rem] tw:leading-none tw:font-bold tw:tabular-nums">{total.toLocaleString()}</span>
              <span className="tw:mt-1.5 tw:text-sm tw:text-muted-foreground">{capitalize(total === 1 ? unit[0] : unit[1])}</span>
            </div>
          </div>

          <ul className="tw:m-0 tw:flex tw:w-full tw:min-w-0 tw:flex-1 tw:list-none tw:flex-col tw:p-0">
            {rows.map((row) => (
              <li key={row.key} className="tw:flex tw:items-center tw:gap-3 tw:border-b tw:border-border tw:py-3 tw:text-sm tw:last:border-b-0">
                <span aria-hidden="true" className="tw:size-3 tw:shrink-0 tw:rounded-full" style={{ backgroundColor: row.color }} />
                <span className="tw:min-w-0 tw:flex-1">
                  <span className="tw:block tw:truncate tw:font-medium tw:text-foreground">
                    {row.label}
                    {row.detail ? <span className="tw:font-normal tw:text-muted-foreground"> ({row.detail})</span> : null}
                  </span>
                  {row.amountCentavos !== undefined ? (
                    <Money value={row.amountCentavos} className="tw:block tw:text-xs tw:text-muted-foreground tw:tabular-nums" />
                  ) : null}
                </span>
                <span className="tw:w-6 tw:shrink-0 tw:text-right tw:font-semibold tw:tabular-nums">{row.count.toLocaleString()}</span>
                <span className="tw:w-12 tw:shrink-0 tw:text-right tw:text-muted-foreground tw:tabular-nums">{formatShare(row.count, total)}</span>
              </li>
            ))}
          </ul>
        </div>
        </div>
      )}
    </DashboardCard>
  );
}
