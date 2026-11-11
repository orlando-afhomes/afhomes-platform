"use client";

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/lib/utils";

/** Page numbers to show, with "ellipsis" gaps: first, last, and the current page +/- 1. */
export function pageItems(page: number, pageCount: number): Array<number | "ellipsis"> {
  const wanted = new Set([1, pageCount, page - 1, page, page + 1].filter((n) => n >= 1 && n <= pageCount));
  const sorted = [...wanted].sort((a, b) => a - b);
  const items: Array<number | "ellipsis"> = [];
  sorted.forEach((n, index) => {
    if (index > 0 && n - sorted[index - 1] > 1) items.push("ellipsis");
    items.push(n);
  });
  return items;
}

const NAV_BUTTON = "tw:size-11 tw:sm:size-8";

/**
 * Shared table pagination (1-based `page`). Shows the visible range and total,
 * first/previous/next/last buttons and numbered pages. Below `sm` the numbers
 * collapse to "page / total". With a single page only the count is shown.
 */
export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  className,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  className?: string;
}) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(Math.max(page, 1), pageCount);
  const from = total === 0 ? 0 : (current - 1) * pageSize + 1;
  const to = Math.min(current * pageSize, total);

  return (
    <div className={cn("tw:flex tw:flex-col tw:gap-3 tw:border-t tw:border-border tw:px-3 tw:py-3 tw:sm:flex-row tw:sm:items-center tw:sm:justify-between", className)}>
      <p className="tw:m-0 tw:text-sm tw:text-muted-foreground" aria-live="polite">
        {total === 0 ? "No results" : <>Showing <span className="tw:font-semibold tw:text-foreground">{from}–{to}</span> of <span className="tw:font-semibold tw:text-foreground">{total.toLocaleString()}</span></>}
      </p>
      <div className="tw:flex tw:flex-wrap tw:items-center tw:gap-x-4 tw:gap-y-2">
        {pageCount > 1 ? (
          <nav aria-label="Pagination" className="tw:flex tw:items-center tw:gap-1">
            <Button variant="outline" size="icon-sm" className={NAV_BUTTON} aria-label="First page" disabled={current <= 1} onClick={() => onPageChange(1)}>
              <ChevronsLeft aria-hidden="true" />
            </Button>
            <Button variant="outline" size="icon-sm" className={NAV_BUTTON} aria-label="Previous page" disabled={current <= 1} onClick={() => onPageChange(current - 1)}>
              <ChevronLeft aria-hidden="true" />
            </Button>
            <span className="tw:px-2 tw:text-sm tw:tabular-nums tw:text-muted-foreground tw:sm:hidden">
              {current} / {pageCount}
            </span>
            <ul className="tw:m-0 tw:hidden tw:list-none tw:items-center tw:gap-1 tw:p-0 tw:sm:flex">
              {pageItems(current, pageCount).map((item, index) =>
                item === "ellipsis" ? (
                  <li key={`gap-${index}`} aria-hidden="true" className="tw:px-1 tw:text-muted-foreground">…</li>
                ) : (
                  <li key={item}>
                    <Button
                      variant={item === current ? "default" : "ghost"}
                      size="icon-sm"
                      aria-label={`Page ${item}`}
                      aria-current={item === current ? "page" : undefined}
                      className="tw:min-w-8 tw:tabular-nums"
                      onClick={() => onPageChange(item)}
                    >
                      {item}
                    </Button>
                  </li>
                ),
              )}
            </ul>
            <Button variant="outline" size="icon-sm" className={NAV_BUTTON} aria-label="Next page" disabled={current >= pageCount} onClick={() => onPageChange(current + 1)}>
              <ChevronRight aria-hidden="true" />
            </Button>
            <Button variant="outline" size="icon-sm" className={NAV_BUTTON} aria-label="Last page" disabled={current >= pageCount} onClick={() => onPageChange(pageCount)}>
              <ChevronsRight aria-hidden="true" />
            </Button>
          </nav>
        ) : null}
      </div>
    </div>
  );
}
