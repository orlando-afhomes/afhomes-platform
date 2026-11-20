"use client";

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
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

const NAV_BUTTON = "tw:size-11 tw:rounded-md tw:text-muted-foreground tw:sm:size-8";

/**
 * Shared table pagination (1-based `page`). Shows "Showing page X/Y", a page
 * dropdown, first/previous/next/last buttons and numbered pages. Below `sm` the
 * numbers collapse; with a single page only the count is shown.
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

  return (
    <div className={cn("tw:flex tw:flex-wrap tw:items-center tw:justify-between tw:gap-3 tw:border-t tw:border-border tw:bg-muted/60 tw:px-4 tw:py-2.5 tw:sm:px-5", className)}>
      <div className="tw:flex tw:min-w-0 tw:items-center tw:gap-2.5">
        <p className="tw:m-0 tw:text-sm tw:text-muted-foreground tw:tabular-nums" aria-live="polite">
          {total === 0 ? (
            "No results"
          ) : (
            <>
              Showing page <span className="tw:inline-block tw:rounded-md tw:bg-(--color-brand-soft) tw:px-2 tw:py-0.5 tw:font-semibold tw:text-primary">{current}</span>
              <span className="tw:font-semibold tw:text-foreground">/{pageCount}</span>
            </>
          )}
        </p>
      </div>
      {pageCount > 1 ? (
        <div className="tw:ml-auto tw:flex tw:max-w-full tw:flex-wrap tw:items-center tw:gap-2">
          <Select
            value={String(current)}
            onValueChange={(next) => {
              if (!next) return;
              const target = Number(next);
              if (Number.isInteger(target) && target >= 1 && target <= pageCount) onPageChange(target);
            }}
          >
            <SelectTrigger size="sm" aria-label="Go to page" className="tw:h-11 tw:rounded-xl tw:sm:h-8">
              <SelectValue>{`Page ${current} of ${pageCount}`}</SelectValue>
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false} className="tw:max-h-72">
              {Array.from({ length: pageCount }, (_, index) => index + 1).map((number) => (
                <SelectItem key={number} value={String(number)} className="tw:min-h-11 tw:sm:min-h-8">
                  Page {number}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <nav aria-label="Pagination" className="tw:flex tw:max-w-full tw:items-center tw:rounded-xl tw:border tw:border-border tw:bg-background tw:p-0.5 tw:sm:gap-1">
            <Button variant="ghost" size="icon-sm" className={NAV_BUTTON} aria-label="First page" disabled={current <= 1} onClick={() => onPageChange(1)}>
              <ChevronsLeft aria-hidden="true" />
            </Button>
            <Button variant="ghost" size="icon-sm" className={NAV_BUTTON} aria-label="Previous page" disabled={current <= 1} onClick={() => onPageChange(current - 1)}>
              <ChevronLeft aria-hidden="true" />
            </Button>
            <span className="tw:px-1 tw:text-center tw:text-sm tw:font-medium tw:tabular-nums tw:text-foreground tw:sm:hidden">
              {current} / {pageCount}
            </span>
            <ul className="tw:m-0 tw:hidden tw:list-none tw:items-center tw:gap-1 tw:p-0 tw:sm:flex">
              {pageItems(current, pageCount).map((item, index) =>
                item === "ellipsis" ? (
                  <li key={`gap-${index}`} aria-hidden="true" className="tw:px-1 tw:text-muted-foreground">
                    …
                  </li>
                ) : (
                  <li key={item}>
                    <Button
                      variant={item === current ? "default" : "ghost"}
                      size="icon-sm"
                      aria-label={`Page ${item}`}
                      aria-current={item === current ? "page" : undefined}
                      className="tw:min-w-8 tw:rounded-md tw:px-1 tw:tabular-nums"
                      onClick={() => onPageChange(item)}
                    >
                      {item}
                    </Button>
                  </li>
                ),
              )}
            </ul>
            <Button variant="ghost" size="icon-sm" className={NAV_BUTTON} aria-label="Next page" disabled={current >= pageCount} onClick={() => onPageChange(current + 1)}>
              <ChevronRight aria-hidden="true" />
            </Button>
            <Button variant="ghost" size="icon-sm" className={NAV_BUTTON} aria-label="Last page" disabled={current >= pageCount} onClick={() => onPageChange(pageCount)}>
              <ChevronsRight aria-hidden="true" />
            </Button>
          </nav>
        </div>
      ) : null}
    </div>
  );
}
