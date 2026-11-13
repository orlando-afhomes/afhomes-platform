"use client";

import { useState, type KeyboardEvent, type ReactNode } from "react";
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { Pagination } from "./pagination";
import { Skeleton } from "@/shared/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { isRowControlClick } from "./clickable-row";
import { cn } from "@/shared/lib/utils";

/** Optional per-column presentation set through `columnDef.meta`. */
export type DataTableColumnMeta = {
  /** Extra classes for the header and cells, e.g. hide a column on narrow screens. */
  className?: string;
};

/** Every table shows this many rows per page. */
export const TABLE_PAGE_SIZE = 10;

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
  serverPagination,
  onRowOpen,
  caption,
  rowActions,
  getRowLabel,
  showAllRows = false,
}: {
  data: T[];
  columns: ColumnDef<T, unknown>[];
  getRowId: (row: T) => string;
  emptyText: string;
  loading?: boolean;
  /** For server-paged data (1-based `page`): `data` is already the current page and `total` the full count. */
  serverPagination?: {
    page: number;
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
  };
  /** Opens the record when anywhere on the row is clicked, or Enter/Space is pressed on a focused row. */
  onRowOpen?: (row: T) => void;
  /** Accessible table name. */
  caption?: string;
  /** Renders a trailing Actions column (usually a `RowActionsMenu`) for every row. */
  rowActions?: (row: T) => ReactNode;
  /** Names a row for assistive tech, e.g. "Open Maria Santos". */
  getRowLabel?: (row: T) => string;
  /** Shows every row on one page with no pager (used while printing a report). */
  showAllRows?: boolean;
}) {
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: TABLE_PAGE_SIZE });
  // TanStack Table returns functions that React Compiler cannot memoize safely.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns,
    getRowId,
    state: serverPagination ? undefined : { pagination: showAllRows ? { pageIndex: 0, pageSize: Math.max(data.length, 1) } : pagination },
    onPaginationChange: serverPagination ? undefined : setPagination,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: serverPagination ? undefined : getPaginationRowModel(),
  });
  const rows = table.getRowModel().rows;
  const columnCount = columns.length + (rowActions ? 1 : 0);
  const footer = serverPagination ?? {
    page: pagination.pageIndex + 1,
    pageSize: pagination.pageSize,
    total: data.length,
    onPageChange: (page: number) => table.setPageIndex(page - 1),
  };

  return (
    <div className="tw:flex tw:flex-col">
      <div className="tw:overflow-hidden tw:rounded-2xl tw:border tw:border-border tw:bg-card tw:shadow-(--shadow-soft)">
        <Table aria-label={caption} aria-busy={loading || undefined}>
          <TableHeader>
            {table.getHeaderGroups().map((group) => (
              <TableRow key={group.id} className="tw:bg-(--color-bg-surface) tw:hover:bg-(--color-bg-surface)">
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
              Array.from({ length: 5 }, (_, index) => (
                <TableRow key={`loading-${index}`}>
                  {columns.map((column, columnIndex) => (
                    <TableCell key={`${index}-${columnIndex}`} className={cn("tw:px-3 tw:py-3.5", columnClass(column.meta))}>
                      <Skeleton className={cn("tw:h-4", columnIndex === 0 ? "tw:w-3/5" : index % 2 ? "tw:w-2/3" : "tw:w-1/2")} />
                    </TableCell>
                  ))}
                  {rowActions ? (
                    <TableCell className="tw:px-3 tw:py-3.5">
                      <Skeleton className="tw:ml-auto tw:size-8" />
                    </TableCell>
                  ) : null}
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
        {!loading && !showAllRows && footer.total > 0 ? <Pagination {...footer} /> : null}
      </div>
    </div>
  );
}

export type { ColumnDef };
