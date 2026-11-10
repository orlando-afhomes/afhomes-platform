import { CardSection } from "@/shared/components/modern/card-section";
import { Money } from "@/shared/components/modern/money";
import { Skeleton } from "@/shared/ui/skeleton";
import { formatShare } from "./dashboard-chart-model";
import { DashboardEmptyState, DashboardError } from "./dashboard-layout";

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

/** Donut and legend for a small set of categories counted from authorized records. */
export function DashboardDistributionChart({
  title,
  description,
  rows,
  unit,
  loading,
  error,
  emptyText,
}: {
  title: string;
  description: string;
  rows: readonly DistributionRow[];
  /** Singular and plural nouns for the center total, for example ["contract", "contracts"]. */
  unit: readonly [string, string];
  loading: boolean;
  error: unknown;
  emptyText: string;
}) {
  const total = rows.reduce((sum, row) => sum + row.count, 0);
  const shareOf = (count: number) => (total === 0 ? 0 : (count / total) * 100);
  const segments = rows.map((row, index) => ({
    ...row,
    share: shareOf(row.count),
    offset: rows.slice(0, index).reduce((sum, previous) => sum + shareOf(previous.count), 0),
  }));
  const ariaLabel = `${title}: ${rows.map((row) => `${row.label} ${row.count}`).join(", ")}, total ${total}.`;

  return (
    <CardSection title={title} description={description} className="tw:h-full">
      {loading ? (
        <Skeleton className="tw:h-48 tw:w-full" />
      ) : error ? (
        <DashboardError error={error} fallback="Could not load this distribution." />
      ) : total === 0 ? (
        <DashboardEmptyState>{emptyText}</DashboardEmptyState>
      ) : (
        <div className="tw:flex tw:flex-col tw:items-center tw:gap-6 tw:sm:flex-row">
          <div className="tw:relative tw:flex tw:size-40 tw:shrink-0 tw:items-center tw:justify-center">
            <svg role="img" aria-label={ariaLabel} viewBox="0 0 42 42" className="tw:size-full tw:-rotate-90">
              <circle cx="21" cy="21" r="15.9155" fill="none" stroke="var(--color-bg-sunken)" strokeWidth="5" />
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
                    strokeWidth="5"
                    strokeDasharray={`${segment.share} ${100 - segment.share}`}
                    strokeDashoffset={-segment.offset}
                  />
                ) : null,
              )}
            </svg>
            <div aria-hidden="true" className="tw:absolute tw:flex tw:flex-col tw:items-center tw:justify-center tw:text-center">
              <span className="tw:text-2xl tw:leading-none tw:font-semibold tw:tabular-nums">{total.toLocaleString()}</span>
              <span className="tw:mt-1 tw:text-xs tw:text-muted-foreground">{total === 1 ? unit[0] : unit[1]}</span>
            </div>
          </div>

          <ul className="tw:m-0 tw:flex tw:w-full tw:min-w-0 tw:flex-1 tw:list-none tw:flex-col tw:divide-y tw:divide-border tw:p-0">
            {rows.map((row) => (
              <li key={row.key} className="tw:flex tw:items-center tw:justify-between tw:gap-3 tw:py-2.5 tw:text-sm">
                <span className="tw:flex tw:min-w-0 tw:items-center tw:gap-2">
                  <span aria-hidden="true" className="tw:size-2.5 tw:shrink-0 tw:rounded-full" style={{ backgroundColor: row.color }} />
                  <span className="tw:min-w-0">
                    <span className="tw:block tw:truncate">
                      {row.label}
                      {row.detail ? <span className="tw:text-muted-foreground"> ({row.detail})</span> : null}
                    </span>
                    {row.amountCentavos !== undefined ? (
                      <Money value={row.amountCentavos} className="tw:block tw:text-xs tw:text-muted-foreground tw:tabular-nums" />
                    ) : null}
                  </span>
                </span>
                <span className="tw:flex tw:shrink-0 tw:items-baseline tw:gap-3">
                  <span className="tw:font-semibold tw:tabular-nums">{row.count.toLocaleString()}</span>
                  <span className="tw:w-12 tw:text-right tw:text-xs tw:text-muted-foreground tw:tabular-nums">{formatShare(row.count, total)}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </CardSection>
  );
}
