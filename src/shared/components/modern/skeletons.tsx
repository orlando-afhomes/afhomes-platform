import { Skeleton } from "@/shared/ui/skeleton";
import { cn } from "@/shared/lib/utils";

const CARD = "tw:rounded-2xl tw:border tw:border-border tw:bg-card tw:shadow-(--shadow-soft)";
// Varied widths so rows read as text, not a uniform bar.
const WIDTHS = ["tw:w-3/4", "tw:w-1/2", "tw:w-2/3", "tw:w-5/6", "tw:w-2/5"];

/** Text-like lines of varied width. */
export function TextLinesSkeleton({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn("tw:flex tw:flex-col tw:gap-2.5", className)}>
      {Array.from({ length: lines }, (_, index) => (
        <Skeleton key={index} className={cn("tw:h-4", WIDTHS[index % WIDTHS.length])} />
      ))}
    </div>
  );
}

/** Table frame with a header row and `rows` x `columns` cells. Mirrors DataTable's card. */
export function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className={cn(CARD, "tw:overflow-hidden")}>
      <div className="tw:flex tw:h-11 tw:items-center tw:gap-4 tw:bg-(--color-bg-surface) tw:px-3">
        {Array.from({ length: columns }, (_, index) => (
          <Skeleton key={index} className="tw:h-3.5 tw:flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }, (_, row) => (
        <div key={row} className="tw:flex tw:items-center tw:gap-4 tw:border-t tw:border-border tw:px-3 tw:py-3.5">
          {Array.from({ length: columns }, (_, column) => (
            <Skeleton key={column} className={cn("tw:h-4 tw:flex-1", column === 0 ? "tw:max-w-[40%]" : WIDTHS[(row + column) % WIDTHS.length])} />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Grid of titled cards (products, schemes, team panels). */
export function CardGridSkeleton({ cards = 3, className }: { cards?: number; className?: string }) {
  return (
    <div className={cn("tw:grid tw:gap-4 tw:sm:grid-cols-2 tw:lg:grid-cols-3", className)}>
      {Array.from({ length: cards }, (_, index) => (
        <div key={index} className={cn(CARD, "tw:flex tw:flex-col tw:gap-4 tw:p-5")}>
          <div className="tw:flex tw:items-center tw:gap-3">
            <Skeleton className="tw:size-10 tw:rounded-xl" />
            <Skeleton className="tw:h-5 tw:w-1/2" />
          </div>
          <TextLinesSkeleton lines={3} />
        </div>
      ))}
    </div>
  );
}

/** Record detail: hero card, tab bar, and two columns of label/value rows. */
export function DetailSkeleton() {
  return (
    <div role="status" aria-busy="true" className="tw:flex tw:flex-col tw:gap-6">
      <span className="tw:sr-only">Loading…</span>
      <div className={cn(CARD, "tw:flex tw:items-center tw:gap-4 tw:p-5")}>
        <Skeleton className="tw:size-16 tw:shrink-0 tw:rounded-full" />
        <div className="tw:flex tw:flex-1 tw:flex-col tw:gap-2.5">
          <Skeleton className="tw:h-6 tw:w-1/3" />
          <Skeleton className="tw:h-4 tw:w-1/2" />
        </div>
        <Skeleton className="tw:hidden tw:h-7 tw:w-24 tw:rounded-full tw:sm:block" />
      </div>
      <div className="tw:flex tw:gap-3">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="tw:h-9 tw:w-24" />
        ))}
      </div>
      <div className="tw:grid tw:gap-4 tw:lg:grid-cols-2">
        {Array.from({ length: 2 }, (_, card) => (
          <div key={card} className={cn(CARD, "tw:flex tw:flex-col tw:gap-4 tw:p-5")}>
            <Skeleton className="tw:h-5 tw:w-1/3" />
            {Array.from({ length: 4 }, (_, row) => (
              <div key={row} className="tw:flex tw:gap-3">
                <Skeleton className="tw:h-4 tw:w-28 tw:shrink-0" />
                <Skeleton className={cn("tw:h-4 tw:flex-1", WIDTHS[(card + row) % WIDTHS.length])} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Form: stacked label + input rows. */
export function FormSkeleton({ fields = 4 }: { fields?: number }) {
  return (
    <div className="tw:flex tw:flex-col tw:gap-4">
      {Array.from({ length: fields }, (_, index) => (
        <div key={index} className="tw:flex tw:flex-col tw:gap-2">
          <Skeleton className="tw:h-3.5 tw:w-28" />
          <Skeleton className="tw:h-11 tw:w-full tw:rounded-lg" />
        </div>
      ))}
    </div>
  );
}

/** Whole admin shell (sidebar rail, header, heading, content) for the first paint. */
export function AdminShellSkeleton() {
  return (
    <div role="status" aria-busy="true" className="tw:flex tw:min-h-screen tw:bg-background">
      <span className="tw:sr-only">Loading…</span>
      <div className="tw:hidden tw:w-60 tw:shrink-0 tw:flex-col tw:gap-3 tw:border-r tw:border-border tw:bg-card tw:p-4 tw:md:flex">
        <Skeleton className="tw:mb-4 tw:h-9 tw:w-3/4" />
        {Array.from({ length: 7 }, (_, index) => (
          <Skeleton key={index} className="tw:h-9 tw:w-full tw:rounded-lg" />
        ))}
      </div>
      <div className="tw:flex tw:min-w-0 tw:flex-1 tw:flex-col">
        <div className="tw:flex tw:h-16 tw:items-center tw:justify-between tw:border-b tw:border-border tw:bg-card tw:px-4">
          <Skeleton className="tw:h-8 tw:w-8 tw:rounded-lg" />
          <Skeleton className="tw:size-9 tw:rounded-full" />
        </div>
        <div className="tw:flex tw:flex-col tw:gap-6 tw:p-6">
          <div className="tw:flex tw:flex-col tw:gap-2">
            <Skeleton className="tw:h-8 tw:w-56" />
            <Skeleton className="tw:h-4 tw:w-80 tw:max-w-full" />
          </div>
          <CardGridSkeleton />
          <TableSkeleton />
        </div>
      </div>
    </div>
  );
}
