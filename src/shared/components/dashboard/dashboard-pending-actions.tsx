import type { ReactNode } from "react";
import Link from "next/link";
import { ClipboardList, type LucideIcon } from "lucide-react";
import { Skeleton } from "@/shared/ui/skeleton";
import { cn } from "@/shared/lib/utils";
import { DASHBOARD_TONE_CLASSES, DashboardCard, type DashboardTone } from "./dashboard-layout";

/** Card listing the queues the viewer may act on. Callers include only authorized items. */
export function DashboardPendingActions({
  title = "Pending Approvals",
  description = "Items that require your action",
  children,
}: {
  title?: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <DashboardCard title={title} description={description} icon={ClipboardList}>
      <ul className="tw:-mx-2 tw:-my-1 tw:flex tw:list-none tw:flex-col tw:gap-1 tw:p-0">{children}</ul>
    </DashboardCard>
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
        className="tw:flex tw:min-h-14 tw:items-center tw:gap-3 tw:rounded-xl tw:px-2 tw:py-2 tw:transition-colors tw:hover:bg-muted/70 tw:focus-visible:ring-3 tw:focus-visible:ring-ring/50 tw:focus-visible:outline-none"
      >
        <span aria-hidden="true" className={cn("tw:flex tw:size-10 tw:shrink-0 tw:items-center tw:justify-center tw:rounded-xl", DASHBOARD_TONE_CLASSES[tone])}>
          <Icon className="tw:size-5" strokeWidth={1.75} />
        </span>
        <span className="tw:min-w-0 tw:flex-1 tw:text-sm tw:font-semibold tw:text-foreground">{label}</span>
        {loading ? (
          <Skeleton className="tw:h-7 tw:w-10 tw:rounded-full" />
        ) : (
          <span
            className={cn(
              "tw:inline-flex tw:min-w-10 tw:items-center tw:justify-center tw:rounded-full tw:px-3 tw:py-1 tw:text-sm tw:font-bold tw:tabular-nums",
              !error && count > 0 ? "tw:bg-[var(--color-accent-soft)] tw:text-[var(--color-accent-strong)]" : "tw:bg-muted tw:text-muted-foreground",
            )}
          >
            {error ? "—" : count.toLocaleString()}
          </span>
        )}
      </Link>
    </li>
  );
}
