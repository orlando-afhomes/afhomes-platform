"use client";

import { Fragment, useId, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Money } from "@/shared/components/modern/money";
import { Skeleton } from "@/shared/ui/skeleton";
import { formatDate } from "@/shared/lib/format-date";
import { formatPeso } from "@/shared/lib/money";
import { cn } from "@/shared/lib/utils";
import { axisPeso, monotonePath, niceDomain, tickIndexes, xPercent, yPercent } from "./dashboard-chart-model";
import { DashboardCard, DashboardEmptyState, DashboardError } from "./dashboard-layout";

/** One money series in centavos, aligned with `dates`. */
export type TrendSeries = {
  key: string;
  label: string;
  /** A CSS color, normally a brand token such as `var(--color-brand-primary)`. */
  color: string;
  values: readonly number[];
  /** Empty-state text when this series has no value in the period. */
  emptyText?: string;
};

function shortDate(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  if (!year || !month || !day) return date;
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-PH", { month: "short", day: "numeric", timeZone: "UTC" });
}

function sum(values: readonly number[]) {
  return values.reduce((total, value) => total + value, 0);
}

/** Segmented control (radio group) that switches the visible series. */
function SeriesSwitch({ label, series, value, onChange }: { label: string; series: readonly TrendSeries[]; value: string; onChange: (key: string) => void }) {
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const move = (event: KeyboardEvent, index: number) => {
    const step = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 0;
    if (step === 0) return;
    event.preventDefault();
    const next = (index + step + series.length) % series.length;
    onChange(series[next].key);
    buttons.current[next]?.focus();
  };
  return (
    <div role="radiogroup" aria-label={label} className="tw:inline-flex tw:rounded-xl tw:border tw:border-border tw:bg-muted/60 tw:p-1">
      {series.map((item, index) => {
        const checked = item.key === value;
        return (
          <button
            key={item.key}
            ref={(element) => {
              buttons.current[index] = element;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={checked ? 0 : -1}
            onClick={() => onChange(item.key)}
            onKeyDown={(event) => move(event, index)}
            className={cn(
              "tw:min-h-9 tw:rounded-lg tw:px-3.5 tw:text-sm tw:font-medium tw:whitespace-nowrap tw:transition-colors tw:focus-visible:ring-3 tw:focus-visible:ring-ring/50 tw:focus-visible:outline-none tw:sm:min-h-8",
              checked ? "tw:bg-primary tw:text-primary-foreground tw:shadow-(--shadow-soft)" : "tw:text-muted-foreground tw:hover:text-foreground",
            )}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Daily money trend drawn with native SVG, one series at a time. Every series
 * is summarized and tabulated for assistive technology (visually hidden).
 */
export function DashboardTrendChart({
  title,
  description,
  icon,
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
  icon?: LucideIcon;
  dates: readonly string[];
  series: readonly TrendSeries[];
  loading: boolean;
  error: unknown;
  emptyText: string;
  invalidRange?: boolean;
  note?: ReactNode;
}) {
  const [selectedKey, setSelectedKey] = useState(series[0]?.key ?? "");
  const [hover, setHover] = useState<number | null>(null);
  const gradientId = `trend-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const selected = series.find((item) => item.key === selectedKey) ?? series[0];

  const values = selected?.values ?? [];
  const domain = niceDomain(Math.min(0, ...values), Math.max(0, ...values));
  const zeroY = yPercent(0, domain);
  const points = values.map((value, index) => ({ x: xPercent(index, values.length), y: yPercent(value, domain) }));
  const line = monotonePath(points);
  const empty = dates.length === 0 || values.every((value) => value === 0);
  const wideTicks = new Set(tickIndexes(dates.length, 11));
  const narrowTicks = new Set(tickIndexes(dates.length, 5));
  const xTicks = [...new Set([...wideTicks, ...narrowTicks])].sort((a, b) => a - b);

  const onPointer = (event: PointerEvent<HTMLDivElement>) => {
    if (dates.length < 2) return;
    const box = event.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (event.clientX - box.left) / box.width));
    setHover(Math.round(ratio * (dates.length - 1)));
  };

  let body: ReactNode;
  if (loading) {
    body = <Skeleton className="tw:h-72 tw:w-full" />;
  } else if (error) {
    body = <DashboardError error={error} fallback="Could not load the chart." />;
  } else if (invalidRange) {
    body = <DashboardEmptyState className="tw:min-h-64">Select a valid date range to see this chart.</DashboardEmptyState>;
  } else if (!selected || empty) {
    body = <DashboardEmptyState className="tw:min-h-64">{selected?.emptyText ?? emptyText}</DashboardEmptyState>;
  } else {
    const hoverValue = hover !== null ? values[hover] : null;
    body = (
      <div className="tw:@container tw:grid tw:grid-cols-[4.75rem_1fr] tw:gap-x-3" aria-hidden="true">
        <div className="tw:relative tw:h-64">
          {domain.ticks.map((tick) => (
            <span
              key={tick}
              className="tw:absolute tw:right-0 tw:-translate-y-1/2 tw:text-xs tw:leading-none tw:text-muted-foreground tw:tabular-nums"
              style={{ top: `${yPercent(tick, domain)}%` }}
            >
              {axisPeso(tick)}
            </span>
          ))}
        </div>

        <div className="tw:relative tw:h-64 tw:min-w-0 tw:touch-pan-y" onPointerMove={onPointer} onPointerLeave={() => setHover(null)}>
          {domain.ticks.map((tick) => (
            <span
              key={tick}
              className={cn("tw:absolute tw:inset-x-0 tw:border-t", tick === 0 ? "tw:border-border" : "tw:border-dashed tw:border-border/70")}
              style={{ top: `${yPercent(tick, domain)}%` }}
            />
          ))}

          {dates.length === 1 ? (
            <div className="tw:absolute tw:inset-0 tw:flex tw:justify-center">
              <span className="tw:relative tw:w-12">
                <span
                  className="tw:absolute tw:inset-x-0 tw:rounded-md"
                  style={{
                    top: `${Math.min(points[0].y, zeroY)}%`,
                    height: `${Math.abs(zeroY - points[0].y)}%`,
                    backgroundColor: selected.color,
                  }}
                />
              </span>
            </div>
          ) : (
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="tw:absolute tw:inset-0 tw:h-full tw:w-full tw:overflow-visible">
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={selected.color} stopOpacity={0.24} />
                  <stop offset="100%" stopColor={selected.color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <path d={`${line} L 100 ${zeroY.toFixed(3)} L 0 ${zeroY.toFixed(3)} Z`} fill={`url(#${gradientId})`} />
              <path
                d={line}
                fill="none"
                stroke={selected.color}
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
          )}

          {hover !== null ? (
            <span className="tw:absolute tw:inset-y-0 tw:border-l tw:border-border" style={{ left: `${points[hover].x}%` }} />
          ) : null}

          {dates.length > 1 && dates.length <= 31
            ? points.map((point, index) =>
                values[index] === 0 && hover !== index ? null : (
                <span
                  key={dates[index]}
                  className={cn(
                    "tw:absolute tw:-translate-x-1/2 tw:-translate-y-1/2 tw:rounded-full tw:ring-2 tw:ring-card",
                    hover === index ? "tw:size-3" : "tw:size-2",
                  )}
                  style={{ left: `${point.x}%`, top: `${point.y}%`, backgroundColor: selected.color }}
                />
                ),
              )
            : null}

          {hover !== null && hoverValue !== null ? (
            <span
              className={cn(
                "tw:pointer-events-none tw:absolute tw:z-10 tw:-translate-y-full tw:rounded-lg tw:border tw:border-border tw:bg-popover tw:px-3 tw:py-2 tw:text-xs tw:shadow-(--shadow-raised) tw:whitespace-nowrap",
                points[hover].x > 70 ? "tw:-translate-x-full" : points[hover].x < 30 ? undefined : "tw:-translate-x-1/2",
              )}
              style={{ left: `${points[hover].x}%`, top: `calc(${Math.max(points[hover].y, 12)}% - 0.75rem)` }}
            >
              <span className="tw:block tw:text-muted-foreground">{formatDate(dates[hover])}</span>
              <span className="tw:block tw:font-semibold tw:text-foreground tw:tabular-nums">
                {selected.label}: {formatPeso(hoverValue)}
              </span>
            </span>
          ) : null}
        </div>

        <div />
        <div className="tw:relative tw:mt-2 tw:h-4 tw:text-xs tw:text-muted-foreground">
          {xTicks.map((index) => {
            const wide = wideTicks.has(index);
            const narrow = narrowTicks.has(index);
            return (
              <span
                key={dates[index]}
                className={cn(
                  "tw:absolute tw:top-0 tw:whitespace-nowrap",
                  dates.length === 1 ? "tw:-translate-x-1/2" : index === 0 ? undefined : index === dates.length - 1 ? "tw:-translate-x-full" : "tw:-translate-x-1/2",
                  // Eleven labels only when the chart itself is wide enough; five otherwise.
                  narrow && !wide ? "tw:@[40rem]:hidden" : !narrow && wide ? "tw:hidden tw:@[40rem]:block" : undefined,
                )}
                style={{ left: `${xPercent(index, dates.length)}%` }}
              >
                {shortDate(dates[index])}
              </span>
            );
          })}
        </div>
      </div>
    );
  }

  const ready = !loading && !error && !invalidRange && dates.length > 0;

  return (
    <DashboardCard
      title={title}
      description={description}
      icon={icon}
      actions={series.length > 1 ? <SeriesSwitch label={`${title} series`} series={series} value={selected?.key ?? ""} onChange={setSelectedKey} /> : undefined}
    >
      {body}
      {ready && note ? <p className="tw:mt-3 tw:text-xs tw:text-muted-foreground">{note}</p> : null}
      {ready ? (
        <figure className="tw:sr-only">
          <figcaption>
            {series.map((item, index) => (
              <Fragment key={item.key}>
                {index > 0 ? "; " : null}
                {item.label} <Money value={sum(item.values)} />
              </Fragment>
            ))}
            {` from ${formatDate(dates[0])} to ${formatDate(dates[dates.length - 1])} (Asia/Manila).`}
          </figcaption>
          <table>
            <caption>{`${title}: daily values for the selected period`}</caption>
            <thead>
              <tr>
                <th scope="col">Date</th>
                {series.map((item) => (
                  <th key={item.key} scope="col">
                    {item.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dates.map((date, row) => (
                <tr key={date}>
                  <th scope="row">{formatDate(date)}</th>
                  {series.map((item) => (
                    <td key={item.key}>
                      <Money value={item.values[row] ?? 0} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </figure>
      ) : null}
    </DashboardCard>
  );
}
