import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Card } from "@/shared/ui/card";
import { Skeleton } from "@/shared/ui/skeleton";
import { cn } from "@/shared/lib/utils";
import { DASHBOARD_TONE_CLASSES, type DashboardTone } from "./dashboard-layout";

/** KPI row: one column on mobile, two on tablet, and up to four on wide screens. */
export function DashboardKpiGrid({ children, columns = 4 }: { children: ReactNode; columns?: number }) {
  const wide =
    columns >= 4 ? "tw:xl:grid-cols-4" : columns === 3 ? "tw:xl:grid-cols-3" : columns === 2 ? "tw:xl:grid-cols-2" : undefined;
  return (
    <div className={cn("tw:grid tw:grid-cols-1 tw:gap-4", columns > 1 ? "tw:sm:grid-cols-2" : undefined, wide)}>{children}</div>
  );
}

/**
 * One KPI. `scope` says whether the figure covers the selected period or is a
 * current snapshot (doc 13 section 3.1); values are formatted by the caller.
 */
export function DashboardKpiCard({
  label,
  value,
  icon: Icon,
  tone = "brand",
  scope,
  description,
  loading = false,
  error = null,
}: {
  label: string;
  value: ReactNode;
  icon: LucideIcon;
  tone?: DashboardTone;
  scope: string;
  description?: ReactNode;
  loading?: boolean;
  error?: unknown;
}) {
  return (
    <Card className="tw:h-full tw:flex-row tw:items-start tw:justify-between tw:gap-4 tw:p-5">
      <dl className="tw:m-0 tw:min-w-0 tw:flex-1">
        <dt className="tw:text-sm tw:font-medium tw:text-muted-foreground">{label}</dt>
        <dd className="tw:m-0 tw:mt-2 tw:text-2xl tw:leading-none tw:font-semibold tw:tracking-tight tw:tabular-nums tw:break-words">
          {loading ? (
            <Skeleton className="tw:h-7 tw:w-24" />
          ) : error ? (
            <span className="tw:text-base tw:font-medium tw:text-muted-foreground">Unavailable</span>
          ) : (
            value
          )}
        </dd>
        <dd className="tw:m-0 tw:mt-2 tw:text-xs tw:text-muted-foreground">
          <span className="tw:font-medium tw:text-foreground/80">{scope}</span>
          {description && !loading && !error ? <> · {description}</> : null}
        </dd>
      </dl>
      <span
        aria-hidden="true"
        className={cn("tw:flex tw:size-11 tw:shrink-0 tw:items-center tw:justify-center tw:rounded-xl", DASHBOARD_TONE_CLASSES[tone])}
      >
        <Icon className="tw:size-5" />
      </span>
    </Card>
  );
}
