import type { ReactNode } from "react";
import { TableSkeleton } from "./skeletons";

/**
 * Loading / error wrapper for query results. While loading it shows `skeleton`
 * (a table by default; pass a shape that matches the content) and announces
 * "Loading…" once to assistive tech.
 */
export function QueryState({
  isLoading,
  error,
  skeleton,
  children,
}: {
  isLoading: boolean;
  error: unknown;
  skeleton?: ReactNode;
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
    return (
      <p role="alert" className="tw:rounded-lg tw:border tw:border-destructive/40 tw:p-4 tw:text-sm tw:text-destructive">
        {error instanceof Error ? error.message : "Could not load this data."}
      </p>
    );
  }
  return <>{children}</>;
}
