import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

/**
 * Plain heading (no card) for a filter + table block, e.g. "Verification
 * queue" with a muted policy note. Use it above a `FilterBar`/`DataTable` so
 * the table card sits directly on the page instead of inside another card.
 */
export function AdminSectionHeading({
  title,
  description,
  icon: Icon,
  actions,
}: {
  title: string;
  description?: ReactNode;
  icon?: LucideIcon;
  actions?: ReactNode;
}) {
  return (
    <div className="tw:flex tw:flex-wrap tw:items-start tw:justify-between tw:gap-x-4 tw:gap-y-2">
      <div className="tw:flex tw:min-w-0 tw:items-start tw:gap-3">
        {Icon ? <Icon aria-hidden="true" className="tw:mt-0.5 tw:size-5 tw:shrink-0 tw:text-primary" strokeWidth={1.75} /> : null}
        <div className="tw:min-w-0">
          <h2 className="tw:text-lg tw:leading-snug tw:font-semibold tw:text-foreground">{title}</h2>
          {description ? <p className="tw:mt-0.5 tw:text-sm tw:text-muted-foreground">{description}</p> : null}
        </div>
      </div>
      {actions ? <div className="tw:shrink-0">{actions}</div> : null}
    </div>
  );
}
