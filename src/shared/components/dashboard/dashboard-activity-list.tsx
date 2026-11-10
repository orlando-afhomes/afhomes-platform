import Link from "next/link";
import { ArrowRight, Clock3, type LucideIcon } from "lucide-react";
import { Skeleton } from "@/shared/ui/skeleton";
import { manilaDateOf, manilaToday } from "@/shared/lib/dates";
import { cn } from "@/shared/lib/utils";
import { DASHBOARD_TONE_CLASSES, DashboardCard, DashboardEmptyState, DashboardError, type DashboardTone } from "./dashboard-layout";

export type DashboardActivityEntry = {
  id: string;
  label: string;
  /** One sentence built only from data the viewer may already see. */
  description: string;
  /** ISO timestamp or Asia/Manila date-only value. */
  timestamp: string;
  icon: LucideIcon;
  tone: DashboardTone;
};

const MONTH_DAY: Intl.DateTimeFormatOptions = { timeZone: "Asia/Manila", month: "short", day: "numeric" };

/**
 * Today's events show the Asia/Manila time ("11:24 AM"); older events show the
 * date, with the year only when it is not the current year.
 */
export function formatActivityTime(value: string, today = manilaToday()): string {
  const hasTime = value.includes("T");
  const time = Date.parse(hasTime ? value : `${value}T00:00:00+08:00`);
  if (!Number.isFinite(time)) return value;
  const date = hasTime ? manilaDateOf(value) : value;
  if (hasTime && date === today) {
    return new Date(time).toLocaleTimeString("en-PH", { timeZone: "Asia/Manila", hour: "numeric", minute: "2-digit" });
  }
  const options = date.slice(0, 4) === today.slice(0, 4) ? MONTH_DAY : { ...MONTH_DAY, year: "numeric" as const };
  return new Date(time).toLocaleDateString("en-PH", options);
}

const LINK_CLASS =
  "tw:inline-flex tw:min-h-11 tw:items-center tw:gap-1 tw:whitespace-nowrap tw:rounded-md tw:text-sm tw:font-semibold tw:text-primary tw:underline-offset-4 tw:hover:underline tw:focus-visible:ring-3 tw:focus-visible:ring-ring/50 tw:focus-visible:outline-none tw:sm:min-h-8";

export function DashboardActivityList({
  title = "Recent Activities",
  description = "Latest system transactions and updates",
  items,
  loading,
  error,
  emptyText,
  viewAllHref,
}: {
  title?: string;
  description?: string;
  items: readonly DashboardActivityEntry[];
  loading: boolean;
  error: unknown;
  emptyText: string;
  viewAllHref?: string;
}) {
  return (
    <DashboardCard
      title={title}
      description={description}
      icon={Clock3}
      actions={
        viewAllHref ? (
          <Link href={viewAllHref} className={LINK_CLASS}>
            View All
            <ArrowRight aria-hidden="true" className="tw:size-4" />
          </Link>
        ) : undefined
      }
    >
      {loading ? (
        <div className="tw:flex tw:flex-col tw:gap-4">
          {[0, 1, 2].map((index) => (
            <div key={index} className="tw:flex tw:items-center tw:gap-3">
              <Skeleton className="tw:size-10 tw:rounded-xl" />
              <div className="tw:flex tw:flex-1 tw:flex-col tw:gap-1.5">
                <Skeleton className="tw:h-3.5 tw:w-2/5" />
                <Skeleton className="tw:h-3 tw:w-3/5" />
              </div>
              <Skeleton className="tw:h-3 tw:w-14" />
            </div>
          ))}
        </div>
      ) : error ? (
        <DashboardError error={error} fallback="Could not load recent activity." />
      ) : items.length === 0 ? (
        <DashboardEmptyState>{emptyText}</DashboardEmptyState>
      ) : (
        <ul className="tw:-my-3 tw:flex tw:list-none tw:flex-col tw:divide-y tw:divide-border tw:p-0">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.id} className="tw:flex tw:items-center tw:gap-3 tw:py-3">
                <span
                  aria-hidden="true"
                  className={cn("tw:flex tw:size-10 tw:shrink-0 tw:items-center tw:justify-center tw:rounded-xl", DASHBOARD_TONE_CLASSES[item.tone])}
                >
                  <Icon className="tw:size-5" strokeWidth={1.75} />
                </span>
                <div className="tw:min-w-0 tw:flex-1">
                  <p className="tw:text-sm tw:font-semibold tw:text-foreground">{item.label}</p>
                  <p className="tw:mt-0.5 tw:truncate tw:text-sm tw:text-muted-foreground">{item.description}</p>
                </div>
                <time dateTime={item.timestamp} className="tw:shrink-0 tw:self-start tw:pt-0.5 tw:text-xs tw:whitespace-nowrap tw:text-muted-foreground">
                  {formatActivityTime(item.timestamp)}
                </time>
              </li>
            );
          })}
        </ul>
      )}
    </DashboardCard>
  );
}
