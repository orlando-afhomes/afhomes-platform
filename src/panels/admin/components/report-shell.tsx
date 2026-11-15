"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { FileSpreadsheet, FileText, Printer } from "lucide-react";
import { toast } from "sonner";
import { useRecordReportExport } from "@/data/business-queries";
import { DataTable, type ColumnDef } from "@/shared/components/modern/data-table";
import { QueryState } from "@/shared/components/modern/query-state";
import { RecordDetailsSheet } from "@/shared/components/modern/record-details-sheet";
import { RowActionsMenu } from "@/shared/components/modern/row-actions-menu";
import { downloadCsv, downloadXlsx } from "@/shared/lib/spreadsheet";
import { formatDate } from "@/shared/lib/format-date";
import { Button } from "@/shared/ui/button";
import { addMonthsToDate, manilaDateOf, manilaToday } from "@/shared/lib/dates";
import { StandardDateField } from "@/shared/forms/modern";
import { FilterBar } from "@/shared/components/modern/filter-bar";
import type { BreadcrumbItem } from "@/shared/components/modern/breadcrumbs";
import { AdminPage } from "@/shared/components/admin";

const PRESETS = [
  { value: "today", label: "Today" },
  { value: "7d", label: "Past 7 Days" },
  { value: "28d", label: "Past 28 Days" },
  { value: "6m", label: "Past 6 Months" },
  { value: "custom", label: "Custom range" },
];

function addDays(dateOnly: string, days: number): string {
  const [year, month, day] = dateOnly.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

/** Shared date-range state of every report. Each figure filters on its own source event date (doc 11). */
export function useReportRangeState() {
  const today = manilaToday();
  const [preset, setPreset] = useState("28d");
  const [customFrom, setCustomFrom] = useState(addDays(today, -28));
  const [customTo, setCustomTo] = useState(today);

  const { from, to } = useMemo(() => {
    if (preset === "today") return { from: today, to: today };
    if (preset === "7d") return { from: addDays(today, -7), to: today };
    if (preset === "28d") return { from: addDays(today, -28), to: today };
    if (preset === "6m") return { from: addMonthsToDate(today, -6) ?? today, to: today };
    return { from: customFrom, to: customTo };
  }, [preset, today, customFrom, customTo]);
  const inRange = (date: string | null | undefined) => Boolean(date) && manilaDateOf(date as string) >= from && manilaDateOf(date as string) <= to;

  const filters = (
    <FilterBar filters={[{ label: "Date range", value: preset, onChange: setPreset, options: PRESETS }]}>
      {preset === "custom" ? (
        <>
          <StandardDateField label="Start date" value={customFrom} onChange={setCustomFrom} className="tw:md:min-w-0 tw:md:flex-1" />
          <StandardDateField label="End date" value={customTo} onChange={setCustomTo} className="tw:md:min-w-0 tw:md:flex-1" />
        </>
      ) : null}
    </FilterBar>
  );
  return { from, to, inRange, filters };
}

export type ReportRange = ReturnType<typeof useReportRangeState>;

/** One date range for every report inside the provider, so a hub's Summary and report tabs stay on the same range. */
export const ReportRangeContext = createContext<ReportRange | null>(null);

/** Holds the single report range of a hub; mount it above the tabs so switching tabs keeps the choice. */
export function ReportRangeProvider({ children }: { children: ReactNode }) {
  const range = useReportRangeState();
  return <ReportRangeContext.Provider value={range}>{children}</ReportRangeContext.Provider>;
}

/**
 * The date range of a report. Inside `ReportRangeProvider` every report reads the one shared
 * range (context wins); a report page rendered outside it keeps its own state.
 */
export function useReportRange(): ReportRange {
  const local = useReportRangeState();
  return useContext(ReportRangeContext) ?? local;
}

/** Body of a report without the page chrome: printed date range, date filter, then the content. Report tabs mount this directly. */
export function ReportFrame({ range, children }: { range: ReportRange; children: ReactNode }) {
  return (
    <div className="report-print__page tw:flex tw:flex-col tw:gap-6">
      <p className="report-print__range">Date range: {formatDate(range.from)} to {formatDate(range.to)}</p>
      <div className="report-print__hide">{range.filters}</div>
      {children}
    </div>
  );
}

/** Standard frame of a report page: module gate, breadcrumbs, and date filter. */
export function ReportShell({ range, title, description, crumbs, children }: { range: ReportRange; title: string; /** Optional; one short sentence at most. */ description?: string; crumbs: BreadcrumbItem[]; children: ReactNode }) {
  return (
    <AdminPage anyOf={["reports"]} title={title} description={description} crumbs={crumbs}>
      <ReportFrame range={range}>{children}</ReportFrame>
    </AdminPage>
  );
}

/**
 * One report column: the header and the exact text shown in the table and written to the export.
 * Exports always carry every column; `screen: false` keeps a column out of the on-screen table
 * (5 data columns at most) and shows it only in "View full details".
 */
export type ReportColumn<T> = { header: string; value: (row: T) => string; screen?: boolean };

/** Header row plus one text row per record. Cell values are already formatted strings, so money stays exact. */
export function buildExportRows<T>(columns: ReportColumn<T>[], rows: T[]): string[][] {
  return [columns.map((column) => column.header), ...rows.map((row) => columns.map((column) => column.value(row)))];
}

/** Excel, CSV and Print buttons. An export is audited (report, format, range and row count only) before the file is written. */
export function ReportExport<T>({ report, fileName, columns, rows, range, printable = true }: { report: string; fileName: string; columns: ReportColumn<T>[]; rows: T[]; range: { from: string; to: string } | null; /** False on pages that have no print layout. */ printable?: boolean }) {
  const record = useRecordReportExport();
  const [busy, setBusy] = useState(false);
  const run = async (format: "xlsx" | "csv") => {
    setBusy(true);
    try {
      await record.mutateAsync({ report, format, range, rowCount: rows.length });
      const data = buildExportRows(columns, rows);
      const name = `${fileName}-${manilaToday()}.${format}`;
      if (format === "xlsx") await downloadXlsx(name, [{ name: report.slice(0, 31), rows: data }]);
      else downloadCsv(name, data);
      toast.success(`${rows.length} row(s) exported.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The export failed.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="report-print__hide tw:flex tw:flex-wrap tw:justify-end tw:gap-2" role="group" aria-label="Export this report">
      <Button variant="outline" disabled={busy} onClick={() => void run("xlsx")}><FileSpreadsheet aria-hidden /> Excel</Button>
      <Button variant="outline" disabled={busy} onClick={() => void run("csv")}><FileText aria-hidden /> CSV</Button>
      {printable ? <Button variant="outline" onClick={() => window.print()}><Printer aria-hidden /> Print</Button> : null}
    </div>
  );
}

/** True while the browser prints, so a table can show every row instead of one page. */
function usePrinting(): boolean {
  const [printing, setPrinting] = useState(false);
  useEffect(() => {
    const before = () => flushSync(() => setPrinting(true));
    const after = () => setPrinting(false);
    window.addEventListener("beforeprint", before);
    window.addEventListener("afterprint", after);
    return () => {
      window.removeEventListener("beforeprint", before);
      window.removeEventListener("afterprint", after);
    };
  }, []);
  return printing;
}

/**
 * Filters, export toolbar and a table of the rows behind a report's figures. Callers pass already filtered rows.
 * The table shows the `screen` columns; a row click or its "View full details" menu item opens every column,
 * and the Excel and CSV files always hold every column.
 */
export function ReportTable<T>({ report, fileName, range, columns, rows, getRowId, getRowTitle, filters, loading, error, emptyText }: { report: string; fileName: string; range: { from: string; to: string } | null; columns: ReportColumn<T>[]; rows: T[]; getRowId: (row: T) => string; /** Names a row in its details panel and menu; defaults to the first column's value. */ getRowTitle?: (row: T) => string; filters?: ReactNode; loading?: boolean; error?: unknown; emptyText: string }) {
  const printing = usePrinting();
  const [detail, setDetail] = useState<T | null>(null);
  const tableColumns = useMemo<ColumnDef<T, unknown>[]>(
    () => columns.flatMap((column, index) => (column.screen === false ? [] : [{ id: `c${index}`, header: column.header, cell: ({ row }) => column.value(row.original) }])),
    [columns],
  );
  const titleOf = (row: T) => getRowTitle?.(row) ?? columns[0]?.value(row) ?? report;
  return (
    <>
      {filters ? <div className="report-print__hide">{filters}</div> : null}
      <ReportExport report={report} fileName={fileName} columns={columns} rows={rows} range={range} />
      <QueryState isLoading={Boolean(loading)} error={error}>
        <DataTable
          data={rows}
          columns={tableColumns}
          getRowId={getRowId}
          emptyText={emptyText}
          caption={report}
          showAllRows={printing}
          onRowOpen={setDetail}
          getRowLabel={(row) => `View full details of ${titleOf(row)}`}
          rowActions={printing ? undefined : (row) => <RowActionsMenu itemName={titleOf(row)} extraItems={[{ key: "details", label: "View full details", onClick: () => setDetail(row) }]} />}
        />
      </QueryState>
      <RecordDetailsSheet
        open={detail !== null}
        onClose={() => setDetail(null)}
        title={detail ? titleOf(detail) : report}
        subtitle={report}
        sections={detail ? [{ rows: columns.map((column) => ({ label: column.header, value: column.value(detail) })) }] : []}
      />
    </>
  );
}
