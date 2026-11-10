"use client";

import { useState, type KeyboardEvent, type ReactNode } from "react";
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Skeleton } from "@/shared/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { isRowControlClick } from "./clickable-row";
import { cn } from "@/shared/lib/utils";

/** Optional per-column presentation set through `columnDef.meta`. */
export type DataTableColumnMeta = {
  /** Extra classes for the header and cells, e.g. hide a column on narrow screens. */
  className?: string;
};

const columnClass = (meta: unknown) => (meta as DataTableColumnMeta | undefined)?.className;

/**
 * Directory table for migrated screens (TanStack Table v8 + shadcn Table).
 * Sorting and filtering stay with the caller (data arrives already ordered
 * and filtered), so repository-backed behavior is unchanged; this component
 * owns column rendering, client pagination, loading, and empty states. Rows
 * keep `data-row-key`, and row clicks ignore clicks from controls in the row.
 *
 * Callers must memoize `columns` and `data`: TanStack renders cell functions
 * as components, so a new columns array on every render remounts every cell,
 * losing state such as an open row dialog.
 */
export function DataTable<T>({
  data,
  columns,
  getRowId,
  emptyText,
  loading = false,
  pageSize = 10,
  paginate = true,
  onRowOpen,
  caption,
  rowActions,
  getRowLabel,
}: {
  data: T[];
  columns: ColumnDef<T, unknown>[];
  getRowId: (row: T) => string;
  emptyText: string;
  loading?: boolean;
  pageSize?: number;
  /** Set false for short read-only history tables that should show all rows. */
  paginate?: boolean;
  /** Opens the record when anywhere on the row is clicked, or Enter/Space is pressed on a focused row. */
  onRowOpen?: (row: T) => void;
  /** Accessible table name. */
  caption?: string;
  /** Renders a trailing Actions column (usually a `RowActionsMenu`) for every row. */
  rowActions?: (row: T) => ReactNode;
  /** Names a row for assistive tech, e.g. "Open Maria Santos". */
  getRowLabel?: (row: T) => string;
}) {
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize });
  // TanStack Table returns functions that React Compiler cannot memoize safely.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns,
    getRowId,
    state: paginate ? { pagination } : undefined,
    onPaginationChange: paginate ? setPagination : undefined,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: paginate ? getPaginationRowModel() : undefined,
  });
  const rows = table.getRowModel().rows;
  const columnCount = columns.length + (rowActions ? 1 : 0);
  const pageCount = table.getPageCount();

  return (
    <div className="tw:flex tw:flex-col tw:gap-3">
      <div className="tw:overflow-hidden tw:rounded-2xl tw:border tw:border-border tw:bg-card tw:shadow-(--shadow-soft)">
        <Table aria-label={caption}>
          <TableHeader>
            {table.getHeaderGroups().map((group) => (
              <TableRow key={group.id} className="tw:bg-[var(--color-bg-surface)] tw:hover:bg-[var(--color-bg-surface)]">
                {group.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={cn("tw:h-11 tw:px-3 tw:font-semibold tw:text-foreground", columnClass(header.column.columnDef.meta))}
                  >
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
                {rowActions ? (
                  <TableHead className="tw:h-11 tw:w-16 tw:px-3 tw:text-right tw:font-semibold tw:text-foreground">
                    <span className="tw:sr-only">Actions</span>
                  </TableHead>
                ) : null}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 4 }, (_, index) => (
                <TableRow key={`loading-${index}`}>
                  <TableCell colSpan={columnCount} className="tw:px-3 tw:py-3">
                    <Skeleton className="tw:h-5 tw:w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columnCount} className="tw:px-3 tw:py-10 tw:text-center tw:text-muted-foreground">
                  {emptyText}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-row-key={row.id}
                  tabIndex={onRowOpen ? 0 : undefined}
                  aria-label={onRowOpen ? getRowLabel?.(row.original) : undefined}
                  className={cn(
                    "tw:even:bg-[var(--color-bg-subtle)]",
                    onRowOpen ? "tw:cursor-pointer tw:outline-none tw:focus-visible:bg-muted/60 tw:focus-visible:ring-2 tw:focus-visible:ring-inset tw:focus-visible:ring-ring/50" : undefined,
                  )}
                  onClick={
                    onRowOpen
                      ? (event) => {
                          if (!isRowControlClick(event)) onRowOpen(row.original);
                        }
                      : undefined
                  }
                  onKeyDown={
                    onRowOpen
                      ? (event: KeyboardEvent) => {
                          // Only when the row itself has focus, never for keys typed in a control inside it.
                          if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) {
                            event.preventDefault();
                            onRowOpen(row.original);
                          }
                        }
                      : undefined
                  }
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className={cn("tw:px-3 tw:py-2", columnClass(cell.column.columnDef.meta))}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                  {rowActions ? <TableCell className="tw:px-3 tw:py-2 tw:text-right">{rowActions(row.original)}</TableCell> : null}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      {!loading && paginate && pageCount > 1 ? (
        <nav aria-label="Pagination" className="tw:flex tw:items-center tw:justify-center tw:gap-3">
          <Button
            variant="outline"
            size="sm"
            className="tw:min-h-11 tw:sm:min-h-7"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft aria-hidden="true" /> Previous
          </Button>
          <span className="tw:text-sm tw:text-muted-foreground" aria-live="polite">
            Page {pagination.pageIndex + 1} of {pageCount}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="tw:min-h-11 tw:sm:min-h-7"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next <ChevronRight aria-hidden="true" />
          </Button>
        </nav>
      ) : null}
    </div>
  );
}

export type { ColumnDef };
