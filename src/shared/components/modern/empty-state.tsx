import type { ReactNode } from "react";
import { cn } from "@/shared/lib/utils";

/**
 * Truthful empty state for a loaded result that has no records. Use `title` and
 * `text` to distinguish "nothing yet" from "no matches". Server-safe: no hooks
 * or handlers, so it can render in both server and client components.
 */
export function EmptyState({
  icon,
  title,
  text,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  text?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "tw:flex tw:flex-col tw:items-center tw:justify-center tw:gap-3 tw:rounded-2xl tw:border tw:border-dashed tw:border-border tw:bg-card/60 tw:px-6 tw:py-10 tw:text-center",
        className,
      )}
    >
      {icon ? (
        <span
          aria-hidden="true"
          className="tw:flex tw:size-12 tw:shrink-0 tw:items-center tw:justify-center tw:rounded-2xl tw:bg-primary/10 tw:text-primary tw:[&_svg]:size-6"
        >
          {icon}
        </span>
      ) : null}
      <div className="tw:flex tw:flex-col tw:gap-1">
        <p className="tw:text-base tw:font-semibold tw:text-foreground">{title}</p>
        {text ? <p className="tw:max-w-md tw:text-sm tw:text-muted-foreground">{text}</p> : null}
      </div>
      {action ? <div className="tw:mt-1 tw:flex tw:flex-wrap tw:items-center tw:justify-center tw:gap-2">{action}</div> : null}
    </div>
  );
}
