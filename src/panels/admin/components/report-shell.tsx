"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { ChevronDown, Download, FileDown, FileSpreadsheet, FileText, Printer } from "lucide-react";
import { toast } from "sonner";
import { useRecordReportExport } from "@/data/business-queries";
import { DataTable, type ColumnDef } from "@/shared/components/modern/data-table";
import { QueryState } from "@/shared/components/modern/query-state";
import { RecordDetailsSheet } from "@/shared/components/modern/record-details-sheet";
import { downloadCsv, downloadXlsx } from "@/shared/lib/spreadsheet";
import { formatDate } from "@/shared/lib/format-date";
import { Button, actionMenuClass } from "@/shared/ui/button";
import { cn } from "@/shared/lib/utils";
import { manilaDateOf, manilaToday } from "@/shared/lib/dates";
import { displayValue } from "@/shared/lib/empty-value";
import { DateRangeFields } from "@/shared/components/modern/date-range-fields";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/shared/ui/dropdown-menu";
import type { BreadcrumbItem } from "@/shared/components/modern/breadcrumbs";
import { AdminPage } from "@/shared/components/admin";
import { createReportPdf, downloadReportPdf, ReportPdfPreview } from "../documents/report-pdf-output";

function addDays(dateOnly: string, days: number): string {
  const [year, month, day] = dateOnly.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

/** Bounds used when a From or To date is cleared, so "no limit" still compares as plain text. */
export const OPEN_FROM = "1900-01-01";
export const OPEN_TO = "2999-12-31";

/**
 * Shared date range of every report: From and To dates (default: the last 28 days ending today in
 * Asia/Manila). Each figure filters on its own source event date (doc 11). `from` and `to` are always
 * YYYY-MM-DD text; a cleared field means no limit. `dateFields` is the From/To pair for a report's FilterBar.
 */
export function useReportRangeState() {
  const today = manilaToday();
  const [dates, setDates] = useState(() => ({ from: addDays(today, -28), to: today }));
  const from = dates.from || OPEN_FROM;
  const to = dates.to || OPEN_TO;
  const inRange = (date: string | null | undefined) => Boolean(date) && manilaDateOf(date as string) >= from && manilaDateOf(date as string) <= to;
  const dateFields = <DateRangeFields from={dates.from} to={dates.to} onChange={setDates} />;
  return { from, to, inRange, dateFields, setDates };
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

/** Printed wording of a range; a cleared From or To reads "any date". */
export function describeRange(range: { from: string; to: string }): string {
  return `${range.from === OPEN_FROM ? "any date" : formatDate(range.from)} to ${range.to === OPEN_TO ? "any date" : formatDate(range.to)}`;
}

/** One PDF header line for the filters in effect; empty parts are left out. */
export function describeFilters(parts: readonly (string | false | null | undefined)[]): string[] {
  const active = parts.filter(Boolean) as string[];
  return active.length ? [`Filters: ${active.join(" · ")}`] : [];
}

/** Body of a report without the page chrome: the printed date range, then the content (each report puts the From/To fields in its own filter bar). Report tabs mount this directly. */
export function ReportFrame({ range, children }: { range: ReportRange; children: ReactNode }) {
  return (
    <div className="report-print__page tw:flex tw:flex-col tw:gap-6">
      <p className="report-print__range">Date range: {describeRange(range)}</p>
      {children}
    </div>
  );
}

/** Standard frame of a report page: module gate, breadcrumbs, and printed date range. */
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
 * (5 data columns at most) and shows it only in the row's details panel.
 */
export type ReportColumn<T> = { header: string; value: (row: T) => string; screen?: boolean };

/** Header row plus one text row per record. Cell values are already formatted strings, so money stays exact. */
export function buildExportRows<T>(columns: ReportColumn<T>[], rows: T[]): string[][] {
  return [columns.map((column) => column.header), ...rows.map((row) => columns.map((column) => column.value(row)))];
}

/** Audits one explicit output action using the same filtered rows as the report. */
export function ReportExport<T>({
  report, fileName, columns, rows, range, metadata, printable = true, pdfOnly = false, disabled = false, className,
}: {
  report: string;
  fileName: string;
  columns: ReportColumn<T>[];
  rows: T[];
  range: { from: string; to: string } | null;
  /** Extra PDF header lines, e.g. the active filters. */
  metadata?: readonly string[];
  printable?: boolean;
  pdfOnly?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  const record = useRecordReportExport();
  const [busy, setBusy] = useState(false);
  const running = useRef(false);
  const [preview, setPreview] = useState<Blob>();
  const run = async (action: "xlsx" | "csv" | "pdf" | "print") => {
    if (running.current || disabled) return;
    running.current = true;
    setBusy(true);
    try {
      const format = action === "print" ? "pdf" : action;
      await record.mutateAsync({ report, format, range, rowCount: rows.length });
      const [headers, ...data] = buildExportRows(columns, rows);
      const today = manilaToday();
      const name = `${fileName}-${today}.${format}`;
      if (format === "pdf") {
        const file = await createReportPdf({
          title: report,
          generated: formatDate(today),
          metadata: [...(range ? [`Date range: ${describeRange(range)}`] : []), ...(metadata ?? [])],
          columns: headers,
          rows: data,
        });
        if (action === "print") {
          setPreview(file);
          return;
        }
        downloadReportPdf(file, name);
      } else if (format === "xlsx") {
        await downloadXlsx(name, [{ name: report.slice(0, 31), rows: [headers, ...data] }]);
      } else downloadCsv(name, [headers, ...data]);
      toast.success(`${rows.length} row(s) exported.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The export failed.");
    } finally {
      running.current = false;
      setBusy(false);
    }
  };
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="teal" disabled={disabled} loading={busy} className={cn("report-print__hide tw:h-11 tw:w-full tw:md:w-auto tw:md:flex-none", className)} />}>
          <Download aria-hidden /> Export <ChevronDown aria-hidden />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="tw:min-w-40">
          {!pdfOnly ? <>
            <DropdownMenuItem className={cn("tw:min-h-11 tw:sm:min-h-8", actionMenuClass("teal"))} onClick={() => void run("xlsx")}><FileSpreadsheet aria-hidden /> Excel</DropdownMenuItem>
            <DropdownMenuItem className={cn("tw:min-h-11 tw:sm:min-h-8", actionMenuClass("cyan"))} onClick={() => void run("csv")}><FileText aria-hidden /> CSV</DropdownMenuItem>
          </> : null}
          <DropdownMenuItem className={cn("tw:min-h-11 tw:sm:min-h-8", actionMenuClass("violet"))} onClick={() => void run("pdf")}><FileDown aria-hidden /> Download PDF</DropdownMenuItem>
          {printable ? <DropdownMenuItem className={cn("tw:min-h-11 tw:sm:min-h-8", actionMenuClass("info"))} onClick={() => void run("print")}><Printer aria-hidden /> Print</DropdownMenuItem> : null}
        </DropdownMenuContent>
      </DropdownMenu>
      {preview ? <ReportPdfPreview file={preview} title={report} onClose={() => setPreview(undefined)} /> : null}
    </>
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
 * Filters, the Export menu and a table of the rows behind a report's figures. Callers pass already filtered rows.
 * The table shows the `screen` columns; opening a row shows every column, and the Excel and CSV files always hold
 * every column. `filters` receives the Export button, so a report places it inside its own filter bar.
 */
export function ReportTable<T>({ report, fileName, range, metadata, columns, rows, getRowId, getRowTitle, filters, loading, error, emptyText }: { report: string; fileName: string; range: { from: string; to: string } | null; metadata?: readonly string[]; columns: ReportColumn<T>[]; rows: T[]; getRowId: (row: T) => string; /** Names a row in its details panel; defaults to the first column's value. */ getRowTitle?: (row: T) => string; filters?: (exportButton: ReactNode) => ReactNode; loading?: boolean; error?: unknown; emptyText: string }) {
  const printing = usePrinting();
  const [detail, setDetail] = useState<T | null>(null);
  const tableColumns = useMemo<ColumnDef<T, unknown>[]>(
    () => {
      const shown = columns.filter((column) => column.screen !== false);
      return shown.map((column, index) => ({
        id: `c${index}`,
        header: column.header,
        // The first column names the row: plain bold text, and the whole row opens the details.
        cell: ({ row }) => (index === 0 ? <span className="tw:font-semibold">{displayValue(column.value(row.original))}</span> : column.value(row.original)),
      }));
    },
    [columns],
  );
  const titleOf = (row: T) => getRowTitle?.(row) ?? columns[0]?.value(row) ?? report;
  const exportButton = <ReportExport report={report} fileName={fileName} columns={columns} rows={rows} range={range} metadata={metadata} disabled={Boolean(loading || error)} />;
  return (
    <>
      {filters ? <div className="report-print__hide">{filters(exportButton)}</div> : exportButton}
      <QueryState isLoading={Boolean(loading)} error={error}>
        <DataTable
          data={rows}
          columns={tableColumns}
          getRowId={getRowId}
          emptyText={emptyText}
          caption={report}
          showAllRows={printing}
          onRowOpen={setDetail}
          getRowLabel={(row) => `Open details of ${titleOf(row)}`}
        />
      </QueryState>
      <RecordDetailsSheet
        open={detail !== null}
        onClose={() => setDetail(null)}
        title={detail ? titleOf(detail) : report}
        subtitle={report}
        sections={detail ? [{ rows: columns.map((column) => ({ label: column.header, value: displayValue(column.value(detail)) })) }] : []}
      />
    </>
  );
}
