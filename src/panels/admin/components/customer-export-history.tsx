"use client";

import { useMemo } from "react";
import { useVipProducts } from "@/data/business-queries";
import { tierOptions } from "@/modules/vip/tier-options";
import { Download } from "lucide-react";
import { MAX_EXPORT_ROWS, type CustomerImportJob } from "@/modules/customers/import";
import { type ColumnDef } from "@/shared/components/modern/data-table";
import { QueryState } from "@/shared/components/modern/query-state";
import { RecordDetailsSheet } from "@/shared/components/modern/record-details-sheet";
import { RowActionsMenu } from "@/shared/components/modern/row-actions-menu";
import { SelectField } from "@/shared/forms/modern";
import { Button } from "@/shared/ui/button";
import { DataTable } from "@/shared/components/modern/data-table";
import { AdminSectionHeading } from "@/shared/components/admin";
import { TemplateStep } from "./customer-import-steps";
import { recordLabel } from "@/shared/lib/record-label";

function importJobLabel(job: CustomerImportJob): string {
  const imported = new Date(job.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "Asia/Manila" });
  return recordLabel("Import", job.fileName, imported);
}

export const EXPORT_STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "draft", label: "Draft" },
  { value: "submitted", label: "Submitted" },
  { value: "approved", label: "Approved" },
  { value: "sent_back", label: "Sent back" },
  { value: "rejected", label: "Rejected" },
  { value: "active_member", label: "Active Member" },
  { value: "inactive", label: "Inactive" },
];

/** "All VIP tiers" plus every tier in the product catalog (seeded labels until it loads). */
export function exportPlanOptions(products: Parameters<typeof tierOptions>[0]) {
  return [{ value: "all", label: "All VIP tiers" }, ...tierOptions(products)];
}

export const EXPORT_FORMAT_OPTIONS: { value: "xlsx" | "csv"; label: string }[] = [
  { value: "xlsx", label: "Excel (.xlsx)" },
  { value: "csv", label: "CSV (.csv)" },
];

/**
 * Presentational export card in the import-tab step language. All data,
 * filtering, and repository work stays with the owning panel; this card only
 * renders the selects, the export button, and the matching-row count.
 */
export function ExportCustomersCard({
  status,
  setStatus,
  plan,
  setPlan,
  format,
  setFormat,
  matchingCount,
  loading,
  exporting,
  onExport,
}: {
  status: string;
  setStatus: (value: string) => void;
  plan: string;
  setPlan: (value: string) => void;
  format: "xlsx" | "csv";
  setFormat: (value: "xlsx" | "csv") => void;
  matchingCount: number;
  loading: boolean;
  exporting: boolean;
  onExport: () => void;
}) {
  const products = useVipProducts();
  const planOptions = useMemo(() => exportPlanOptions(products.data), [products.data]);
  return (
    <TemplateStep
      step={1}
      title="Export customers"
      description={`Exports use the template columns. At most ${MAX_EXPORT_ROWS.toLocaleString("en-PH")} rows per file. Every export is recorded in the audit log.`}
    >
      <div className="tw:mt-4 tw:grid tw:grid-cols-1 tw:gap-3 tw:sm:grid-cols-3">
        <SelectField label="Status" value={status} options={EXPORT_STATUS_OPTIONS} onChange={setStatus} />
        <SelectField label="VIP tier" value={plan} options={planOptions} onChange={setPlan} />
        <SelectField label="Format" value={format} options={EXPORT_FORMAT_OPTIONS} onChange={setFormat} />
      </div>
      <div className="tw:mt-4 tw:flex tw:flex-wrap tw:items-center tw:gap-3">
        <Button className="tw:min-h-11 tw:sm:min-h-8" loading={exporting} disabled={loading || matchingCount === 0} onClick={onExport}>
          {exporting ? null : <Download aria-hidden="true" />} Export
        </Button>
        <span className="tw:text-sm tw:text-muted-foreground" role="status">{matchingCount} matching customer(s)</span>
      </div>
    </TemplateStep>
  );
}

/**
 * Presentational job-history card: beige-header directory table (shared with
 * the customer list) plus the per-job details sheet. Query state and the
 * selected job stay with the owning panel via props.
 */
export function HistoryCard({
  jobs,
  isLoading,
  error,
  jobId,
  setJobId,
}: {
  jobs: CustomerImportJob[];
  isLoading: boolean;
  error: unknown;
  jobId: string | null;
  setJobId: (jobId: string | null) => void;
}) {
  const columns = useMemo<ColumnDef<CustomerImportJob, unknown>[]>(
    () => [
      { id: "id", header: "Job", cell: ({ row }) => <span className="tw:font-semibold">{importJobLabel(row.original)}</span> },
      { id: "file", header: "File", meta: { className: "tw:hidden tw:sm:table-cell" }, cell: ({ row }) => row.original.fileName },
      { id: "when", header: "Imported", meta: { className: "tw:hidden tw:md:table-cell" }, cell: ({ row }) => new Date(row.original.createdAt).toLocaleString("en-PH", { timeZone: "Asia/Manila" }) },
      { id: "created", header: "Drafts created", cell: ({ row }) => `${row.original.createdCount} of ${row.original.totalRows}` },
      { id: "skipped", header: "Skipped", cell: ({ row }) => `${row.original.needsReviewCount} for review, ${row.original.invalidCount} invalid` },
    ],
    [],
  );
  const job = jobId ? jobs.find((item) => item.id === jobId) ?? null : null;
  return (
    <section aria-label="Job history" className="customer-history-card tw:flex tw:flex-col tw:gap-4">
      <AdminSectionHeading title="Job history" description="Recent customer imports, newest first." />
      <QueryState isLoading={isLoading} error={error}>
        <DataTable
          data={jobs}
          columns={columns}
          getRowId={(row) => row.id}
          emptyText="No imports yet."
          caption="Customer import jobs"
          onRowOpen={(row) => setJobId(row.id)}
          getRowLabel={(row) => `Open ${importJobLabel(row)}`}
          rowActions={(row) => <RowActionsMenu itemName={importJobLabel(row)} onView={() => setJobId(row.id)} />}
        />
        <RecordDetailsSheet
          open={job !== null}
          onClose={() => setJobId(null)}
          title={job ? importJobLabel(job) : "Import job"}
          subtitle={job?.fileName}
          sections={
            job
              ? [
                  {
                    title: "Result",
                    rows: [
                      { label: "Imported", value: new Date(job.createdAt).toLocaleString("en-PH", { timeZone: "Asia/Manila" }) },
                      { label: "Total rows", value: String(job.totalRows) },
                      { label: "Drafts created", value: String(job.createdCount) },
                      { label: "Needs review", value: String(job.needsReviewCount) },
                      { label: "Invalid", value: String(job.invalidCount) },
                    ],
                  },
                ]
              : []
          }
        />
      </QueryState>
    </section>
  );
}
