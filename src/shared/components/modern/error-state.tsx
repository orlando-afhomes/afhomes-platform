"use client";

import { TriangleAlert } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/lib/utils";

/**
 * Failed-load state. `role="alert"` announces it, and Retry is offered only
 * when the caller passes `onRetry` (that is, when retrying is safe).
 */
export function ErrorState({
  title = "Something went wrong",
  text = "We could not load this right now.",
  onRetry,
  retryLabel = "Try again",
  className,
}: {
  title?: string;
  text?: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn(
        "tw:flex tw:flex-col tw:items-center tw:justify-center tw:gap-3 tw:rounded-2xl tw:border tw:border-destructive/30 tw:bg-destructive/5 tw:px-6 tw:py-8 tw:text-center",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="tw:flex tw:size-11 tw:shrink-0 tw:items-center tw:justify-center tw:rounded-2xl tw:bg-destructive/10 tw:text-destructive"
      >
        <TriangleAlert className="tw:size-5" />
      </span>
      <div className="tw:flex tw:flex-col tw:gap-1">
        <p className="tw:text-base tw:font-semibold tw:text-foreground">{title}</p>
        <p className="tw:max-w-md tw:text-sm tw:text-muted-foreground">{text}</p>
      </div>
      {onRetry ? (
        <Button type="button" variant="outline" onClick={onRetry} className="tw:mt-1">
          {retryLabel}
        </Button>
      ) : null}
    </div>
  );
}
