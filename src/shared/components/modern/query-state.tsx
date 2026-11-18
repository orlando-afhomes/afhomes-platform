import type { ReactNode } from "react";
import { ErrorState } from "./error-state";
import { TableSkeleton } from "./skeletons";

/**
 * Loading / error wrapper for query results. While loading it shows `skeleton`
 * (a table by default; pass a shape that matches the content) and announces
 * "Loading…" once to assistive tech. A failed load renders `ErrorState` and
 * forwards `onRetry` when retrying is safe.
 */
export function QueryState({
  isLoading,
  error,
  skeleton,
  onRetry,
  children,
}: {
  isLoading: boolean;
  error: unknown;
  skeleton?: ReactNode;
  onRetry?: () => void;
  children: ReactNode;
}) {
  if (isLoading) {
    return (
      <div role="status" aria-busy="true">
        <span className="tw:sr-only">Loading…</span>
        {skeleton ?? <TableSkeleton />}
      </div>
    );
  }
  if (error) {
    return <ErrorState text={error instanceof Error ? error.message : undefined} onRetry={onRetry} />;
  }
  return <>{children}</>;
}
