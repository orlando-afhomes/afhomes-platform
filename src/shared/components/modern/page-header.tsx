import type { ReactNode } from "react";
import { cn } from "@/shared/lib/utils";

/** Page title block for migrated screens: heading, description, and an optional actions area. */
export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("tw:mt-3 tw:mb-2 tw:flex tw:flex-col tw:gap-3 tw:sm:flex-row tw:sm:items-start tw:sm:justify-between", className)}>
      <div className="tw:min-w-0">
        <h1 className="tw:text-2xl tw:leading-tight tw:font-semibold tw:text-foreground">{title}</h1>
        {description ? <p className="tw:mt-1 tw:text-sm tw:text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="tw:flex tw:flex-wrap tw:items-center tw:gap-2 tw:sm:justify-end">{actions}</div> : null}
    </div>
  );
}
