import type { ReactNode } from "react";
import { Skeleton } from "@/shared/ui/skeleton";

/** Loading / error wrapper for query results. */
export function QueryState({ isLoading, error, children }: { isLoading: boolean; error: unknown; children: ReactNode }) {
  if (isLoading) return <Skeleton className="tw:h-32 tw:w-full" />;
  if (error) {
    return (
      <p role="alert" className="tw:rounded-lg tw:border tw:border-destructive/40 tw:p-4 tw:text-sm tw:text-destructive">
        {error instanceof Error ? error.message : "Could not load this data."}
      </p>
    );
  }
  return <>{children}</>;
}
