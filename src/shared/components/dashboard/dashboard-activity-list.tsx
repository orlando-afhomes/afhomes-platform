import Link from "next/link";
import { ArrowRight, type LucideIcon } from "lucide-react";
import { CardSection } from "@/shared/components/modern/card-section";
import { Skeleton } from "@/shared/ui/skeleton";
import { formatDate } from "@/shared/lib/format-date";
import { cn } from "@/shared/lib/utils";
import { DASHBOARD_TONE_CLASSES, DashboardEmptyState, DashboardError, type DashboardTone } from "./dashboard-layout";

export type DashboardActivityEntry = {
  id: string;
  label: string;
  /** Record reference the viewer is already allowed to see. */
  reference: string;
  /** ISO timestamp or Asia/Manila date-only value. */
  timestamp: string;
  icon: LucideIcon;
  tone: DashboardTone;
};

function formatActivityTime(value: string) {
  if (value.includes("T")) {
    const time = Date.parse(value);
    if (Number.isFinite(time)) {
      return new Date(time).toLocaleString("en-PH", { timeZone: "Asia/Manila", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
    }
  }
  return formatDate(value);
}

export function DashboardActivityList({
  title = "Recent activity",
  description,
  items,
  loading,
  error,
  emptyText,
  viewAllHref,
}: {
  title?: string;
  description: string;
  items: readonly DashboardActivityEntry[];
  loading: boolean;
  error: unknown;
  emptyText: string;
  viewAllHref?: string;
}) {
  return (
    <CardSection
      title={title}
      description={description}
      className="tw:h-full"
      actions={
        viewAllHref ? (
          <Link
            href={viewAllHref}
            className="tw:inline-flex tw:min-h-11 tw:items-center tw:gap-1 tw:whitespace-nowrap tw:rounded-md tw:text-sm tw:font-medium tw:text-primary tw:underline-offset-4 tw:hover:underline tw:focus-visible:ring-3 tw:focus-visible:ring-ring/50 tw:focus-visible:outline-none tw:sm:min-h-8"
          >
            View all
            <ArrowRight aria-hidden="true" className="tw:size-3.5" />
          </Link>
        ) : undefined
      }
    >
      {loading ? (
        <div className="tw:flex tw:flex-col tw:gap-3">
          {[0, 1, 2].map((index) => (
            <div key={index} className="tw:flex tw:items-center tw:gap-3">
              <Skeleton className="tw:size-9 tw:rounded-lg" />
              <div className="tw:flex tw:flex-1 tw:flex-col tw:gap-1.5">
                <Skeleton className="tw:h-3.5 tw:w-2/5" />
                <Skeleton className="tw:h-3 tw:w-1/4" />
              </div>
              <Skeleton className="tw:h-3 tw:w-16" />
            </div>
          ))}
        </div>
      ) : error ? (
        <DashboardError error={error} fallback="Could not load recent activity." />
      ) : items.length === 0 ? (
        <DashboardEmptyState>{emptyText}</DashboardEmptyState>
      ) : (
        <ul className="tw:m-0 tw:flex tw:list-none tw:flex-col tw:divide-y tw:divide-border tw:p-0">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.id} className="tw:flex tw:items-start tw:gap-3 tw:py-3">
                <span
                  aria-hidden="true"
                  className={cn("tw:flex tw:size-9 tw:shrink-0 tw:items-center tw:justify-center tw:rounded-lg", DASHBOARD_TONE_CLASSES[item.tone])}
                >
                  <Icon className="tw:size-4" />
                </span>
                <div className="tw:min-w-0 tw:flex-1">
                  <p className="tw:text-sm tw:font-medium">{item.label}</p>
                  <p className="tw:mt-0.5 tw:truncate tw:text-xs tw:text-muted-foreground">{item.reference}</p>
                </div>
                <time dateTime={item.timestamp} className="tw:shrink-0 tw:whitespace-nowrap tw:text-xs tw:text-muted-foreground">
                  {formatActivityTime(item.timestamp)}
                </time>
              </li>
            );
          })}
        </ul>
      )}
    </CardSection>
  );
}
