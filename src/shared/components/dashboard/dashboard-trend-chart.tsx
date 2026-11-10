import { Fragment, type ReactNode } from "react";
import { CardSection } from "@/shared/components/modern/card-section";
import { Money } from "@/shared/components/modern/money";
import { Skeleton } from "@/shared/ui/skeleton";
import { formatDate } from "@/shared/lib/format-date";
import { cn } from "@/shared/lib/utils";
import { compactPeso, niceDomain, tickIndexes, xPercent, yPercent, type ChartDomain } from "./dashboard-chart-model";
import { DashboardEmptyState, DashboardError } from "./dashboard-layout";

/** One money series in centavos, aligned with `dates`. */
export type TrendSeries = {
  key: string;
  label: string;
  /** A CSS color, normally a brand token such as `var(--color-brand-primary)`. */
  color: string;
  values: readonly number[];
  /** Shade the area between the line and zero. Use for at most one series. */
  area?: boolean;
};

function shortDate(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  if (!year || !month || !day) return date;
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-PH", { month: "short", day: "numeric", timeZone: "UTC" });
}

function linePath(values: readonly number[], domain: ChartDomain) {
  return values
    .map((value, index) => `${index === 0 ? "M" : "L"} ${xPercent(index, values.length).toFixed(3)} ${yPercent(value, domain).toFixed(3)}`)
    .join(" ");
}

function sum(values: readonly number[]) {
  return values.reduce((total, value) => total + value, 0);
}

/**
 * Daily money trend drawn with native SVG. Every series is listed with its
 * period total, summarized in the caption, and available as a data table.
 */
export function DashboardTrendChart({
  title,
  description,
  dates,
  series,
  loading,
  error,
  emptyText,
  invalidRange = false,
  note,
}: {
  title: string;
  description: string;
  dates: readonly string[];
  series: readonly TrendSeries[];
  loading: boolean;
  error: unknown;
  emptyText: string;
  invalidRange?: boolean;
  note?: ReactNode;
}) {
  const all = series.flatMap((item) => item.values);
  const domain = niceDomain(Math.min(0, ...all), Math.max(0, ...all));
  const empty = dates.length === 0 || all.every((value) => value === 0);
  const zeroY = yPercent(0, domain);
  const xTicks = tickIndexes(dates.length);

  let body: ReactNode;
  if (loading) {
    body = <Skeleton className="tw:h-72 tw:w-full" />;
  } else if (error) {
    body = <DashboardError error={error} fallback="Could not load the chart." />;
  } else if (invalidRange) {
    body = <DashboardEmptyState className="tw:h-64">Select a valid date range to see this chart.</DashboardEmptyState>;
  } else if (empty) {
    body = <DashboardEmptyState className="tw:h-64">{emptyText}</DashboardEmptyState>;
  } else {
    body = (
      <>
        <ul className="tw:m-0 tw:flex tw:list-none tw:flex-wrap tw:items-center tw:gap-x-5 tw:gap-y-2 tw:p-0 tw:text-sm">
          {series.map((item) => (
            <li key={item.key} className="tw:flex tw:items-center tw:gap-2">
              <span aria-hidden="true" className="tw:size-2.5 tw:rounded-full" style={{ backgroundColor: item.color }} />
              <span className="tw:text-muted-foreground">{item.label}</span>
              <Money value={sum(item.values)} className="tw:font-semibold tw:tabular-nums" />
            </li>
          ))}
        </ul>

        <figure className="tw:m-0 tw:flex tw:flex-col tw:gap-2">
          <div className="tw:grid tw:grid-cols-[3.5rem_1fr] tw:gap-x-2">
            <div className="tw:relative tw:h-64 tw:text-right" aria-hidden="true">
              {domain.ticks.map((tick) => (
                <span
                  key={tick}
                  className="tw:absolute tw:right-0 tw:-translate-y-1/2 tw:text-[10px] tw:leading-none tw:text-muted-foreground tw:tabular-nums tw:sm:text-xs"
                  style={{ top: `${yPercent(tick, domain)}%` }}
                >
                  {compactPeso(tick)}
                </span>
              ))}
            </div>

            <div className="tw:relative tw:h-64 tw:min-w-0" aria-hidden="true">
              {domain.ticks.map((tick) => (
                <span
                  key={tick}
                  className={cn("tw:absolute tw:inset-x-0 tw:border-t", tick === 0 ? "tw:border-border" : "tw:border-border/50")}
                  style={{ top: `${yPercent(tick, domain)}%` }}
                />
              ))}

              {dates.length === 1 ? (
                <div className="tw:absolute tw:inset-0 tw:flex tw:justify-center tw:gap-6">
                  {series.map((item) => {
                    const y = yPercent(item.values[0] ?? 0, domain);
                    return (
                      <span key={item.key} className="tw:relative tw:w-10">
                        <span
                          className="tw:absolute tw:inset-x-0 tw:rounded-sm"
                          style={{ top: `${Math.min(y, zeroY)}%`, height: `${Math.abs(zeroY - y)}%`, backgroundColor: item.color }}
                        />
                      </span>
                    );
                  })}
                </div>
              ) : (
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="tw:absolute tw:inset-0 tw:h-full tw:w-full tw:overflow-visible">
                  {series.map((item) => (
                    <Fragment key={item.key}>
                      {item.area ? (
                        <path
                          d={`${linePath(item.values, domain)} L 100 ${zeroY.toFixed(3)} L 0 ${zeroY.toFixed(3)} Z`}
                          fill={item.color}
                          opacity={0.1}
                        />
                      ) : null}
                      <path
                        d={linePath(item.values, domain)}
                        fill="none"
                        stroke={item.color}
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        vectorEffect="non-scaling-stroke"
                      />
                    </Fragment>
                  ))}
                </svg>
              )}

              {dates.length > 1 && dates.length <= 31
                ? series.flatMap((item) =>
                    item.values.map((value, index) => (
                      <span
                        key={`${item.key}-${dates[index]}`}
                        className="tw:absolute tw:size-1.5 tw:-translate-x-1/2 tw:-translate-y-1/2 tw:rounded-full"
                        style={{ left: `${xPercent(index, dates.length)}%`, top: `${yPercent(value, domain)}%`, backgroundColor: item.color }}
                      />
                    )),
                  )
                : null}
            </div>

            <div />
            <div className="tw:relative tw:h-4 tw:text-[10px] tw:text-muted-foreground tw:sm:text-xs" aria-hidden="true">
              {xTicks.map((index) => (
                <span
                  key={dates[index]}
                  className={cn(
                    "tw:absolute tw:top-0 tw:whitespace-nowrap",
                    dates.length === 1 ? "tw:-translate-x-1/2" : index === 0 ? undefined : index === dates.length - 1 ? "tw:-translate-x-full" : "tw:-translate-x-1/2",
                  )}
                  style={{ left: `${xPercent(index, dates.length)}%` }}
                >
                  {shortDate(dates[index])}
                </span>
              ))}
            </div>
          </div>

          <figcaption className="tw:text-xs tw:text-muted-foreground">
            {series.map((item, index) => (
              <Fragment key={item.key}>
                {index > 0 ? "; " : null}
                {item.label}{" "}
                <span className="tw:font-semibold tw:text-foreground">
                  <Money value={sum(item.values)} />
                </span>
              </Fragment>
            ))}
            {` from ${formatDate(dates[0])} to ${formatDate(dates[dates.length - 1])} (Asia/Manila).`}
            {note ? <> {note}</> : null}
          </figcaption>

          <details className="tw:rounded-lg tw:border tw:border-border tw:px-3 tw:py-2">
            <summary className="tw:cursor-pointer tw:rounded-sm tw:text-sm tw:font-medium tw:text-primary tw:focus-visible:ring-3 tw:focus-visible:ring-ring/50 tw:focus-visible:outline-none">
              View chart data
            </summary>
            <div className="tw:mt-2 tw:max-h-64 tw:overflow-auto">
              <table className="tw:w-full tw:border-collapse tw:text-sm">
                <caption className="tw:sr-only">{`${title}: daily values for the selected period`}</caption>
                <thead>
                  <tr className="tw:border-b tw:border-border tw:text-left">
                    <th scope="col" className="tw:py-1.5 tw:pr-3 tw:font-medium">
                      Date
                    </th>
                    {series.map((item) => (
                      <th key={item.key} scope="col" className="tw:py-1.5 tw:pr-3 tw:text-right tw:font-medium tw:last:pr-0">
                        {item.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dates.map((date, row) => (
                    <tr key={date} className="tw:border-b tw:border-border/50 tw:last:border-0">
                      <th scope="row" className="tw:py-1.5 tw:pr-3 tw:text-left tw:font-normal tw:whitespace-nowrap">
                        {formatDate(date)}
                      </th>
                      {series.map((item) => (
                        <td key={item.key} className="tw:py-1.5 tw:pr-3 tw:text-right tw:tabular-nums tw:last:pr-0">
                          <Money value={item.values[row] ?? 0} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </figure>
      </>
    );
  }

  return (
    <CardSection title={title} description={description} className="tw:h-full">
      {body}
    </CardSection>
  );
}
