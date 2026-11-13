import type { MockAsyncOptions } from "@/data/contracts/async-options";

export type ReportExportInput = {
  /** Report name, e.g. "Customer Growth". */
  report: string;
  format: "xlsx" | "csv";
  /** Inclusive date range of the report, or null when the report has no range. */
  range: { from: string; to: string } | null;
  rowCount: number;
};

export interface ReportRepository {
  /** Audits one report export. Only the report name, format, range and row count are recorded, never row data. */
  recordExport(input: ReportExportInput, options?: MockAsyncOptions): Promise<void>;
}
