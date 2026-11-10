import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronRight, type LucideIcon } from "lucide-react";
import { CardSection } from "@/shared/components/modern/card-section";
import { Skeleton } from "@/shared/ui/skeleton";
import { cn } from "@/shared/lib/utils";
import { DASHBOARD_TONE_CLASSES, type DashboardTone } from "./dashboard-layout";

/** Card listing the queues the viewer may act on. Callers include only authorized items. */
export function DashboardPendingActions({
  title = "Pending actions",
  description = "Queues that may need your attention.",
  children,
}: {
  title?: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <CardSection title={title} description={description} className="tw:h-full">
      <ul className="tw:m-0 tw:flex tw:list-none tw:flex-col tw:gap-1 tw:p-0">{children}</ul>
    </CardSection>
  );
}

/** One queue with a real count, linking to an existing page the viewer may open. */
export function DashboardPendingItem({
  href,
  label,
  count,
  icon: Icon,
  tone = "brand",
  loading = false,
  error = null,
}: {
  href: string;
  label: string;
  count: number;
  icon: LucideIcon;
  tone?: DashboardTone;
  loading?: boolean;
  error?: unknown;
}) {
  return (
    <li>
      <Link
        href={href}
        aria-label={loading ? `Loading ${label}` : error ? `${label}: count unavailable` : `${label}: ${count} pending`}
        className="tw:group tw:flex tw:min-h-14 tw:items-center tw:gap-3 tw:rounded-lg tw:px-2 tw:py-2 tw:focus-visible:ring-3 tw:focus-visible:ring-ring/50 tw:focus-visible:outline-none tw:hover:bg-muted"
      >
        <span aria-hidden="true" className={cn("tw:flex tw:size-9 tw:shrink-0 tw:items-center tw:justify-center tw:rounded-lg", DASHBOARD_TONE_CLASSES[tone])}>
          <Icon className="tw:size-4" />
        </span>
        <span className="tw:min-w-0 tw:flex-1 tw:text-sm tw:font-medium">{label}</span>
        {loading ? (
          <Skeleton className="tw:h-6 tw:w-9 tw:rounded-full" />
        ) : (
          <span
            className={cn(
              "tw:inline-flex tw:min-w-9 tw:items-center tw:justify-center tw:rounded-full tw:px-2.5 tw:py-0.5 tw:text-sm tw:font-semibold tw:tabular-nums",
              error ? "tw:bg-muted tw:text-muted-foreground" : count > 0 ? "tw:bg-accent tw:text-accent-foreground" : "tw:bg-muted tw:text-muted-foreground",
            )}
          >
            {error ? "—" : count.toLocaleString()}
          </span>
        )}
        <ChevronRight aria-hidden="true" className="tw:size-4 tw:shrink-0 tw:text-muted-foreground" />
      </Link>
    </li>
  );
}
