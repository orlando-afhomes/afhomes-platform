"use client";

import { EMPTY } from "@/shared/lib/empty-value";
import { useMemo } from "react";
import { useVipProducts } from "@/data/business-queries";
import { useMembers } from "@/data/queries";
import { customerRecordName } from "@/modules/customers/rules";
import type { Customer } from "@/modules/customers/types";
import { tierDisplayName, tierOptions } from "@/modules/vip/tier-options";
import { Download } from "lucide-react";
import { MAX_EXPORT_ROWS, type CustomerImportJob } from "@/modules/customers/import";
import { type ColumnDef } from "@/shared/components/modern/data-table";
import { QueryState } from "@/shared/components/modern/query-state";
import { RecordDetailsSheet } from "@/shared/components/modern/record-details-sheet";
import { FilterBar } from "@/shared/components/modern/filter-bar";
import { BizBadge } from "@/shared/components/business/biz-badge";
import { formatDate } from "@/shared/lib/format-date";
import { SelectField } from "@/shared/forms/modern";
import { Button } from "@/shared/ui/button";
import { DataTable } from "@/shared/components/modern/data-table";
import { AdminSectionHeading } from "@/shared/components/admin";
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
  return [{ value: "all", label: "All VIP card levels" }, ...tierOptions(products)];
}

export const EXPORT_FORMAT_OPTIONS: { value: "xlsx" | "csv" | "pdf"; label: string }[] = [
  { value: "xlsx", label: "Excel (.xlsx)" },
  { value: "csv", label: "CSV (.csv)" },
  { value: "pdf", label: "PDF (.pdf)" },
];

/**
 * Presentational export section. All data, filtering, and repository work stays
 * with the owning panel; this section renders the filters, the format and
 * Export button, and a paged preview of the same rows the export file uses.
 */
export function ExportCustomersCard({
  rows,
  search,
  setSearch,
  status,
  setStatus,
  plan,
  setPlan,
  format,
  setFormat,
  loading,
  exporting,
  onExport,
}: {
  rows: Customer[];
  search: string;
  setSearch: (value: string) => void;
  status: string;
  setStatus: (value: string) => void;
  plan: string;
  setPlan: (value: string) => void;
  format: "xlsx" | "csv" | "pdf";
  setFormat: (value: "xlsx" | "csv" | "pdf") => void;
  loading: boolean;
  exporting: boolean;
  onExport: () => void;
}) {
  const products = useVipProducts();
  const members = useMembers();
  const planOptions = useMemo(() => exportPlanOptions(products.data), [products.data]);
  const memberName = useMemo(() => new Map((members.data ?? []).map((member) => [member.id, member.displayName])), [members.data]);
  const columns = useMemo<ColumnDef<Customer, unknown>[]>(
    () => [
      { id: "name", header: "Customer", cell: ({ row }) => <span className="tw:font-semibold">{customerRecordName(row.original)}</span> },
      { id: "plan", header: "VIP Plan", cell: ({ row }) => tierDisplayName(row.original.vipPlan, products.data) },
      { id: "status", header: "Status", cell: ({ row }) => <BizBadge status={row.original.status} /> },
      {
        id: "owner",
        header: "Seller",
        meta: { className: "tw:hidden tw:sm:table-cell" },
        cell: ({ row }) => (row.original.ownerMemberId ? (memberName.get(row.original.ownerMemberId) ?? EMPTY) : "Company"),
      },
      { id: "submitted", header: "Submitted", meta: { className: "tw:hidden tw:lg:table-cell" }, cell: ({ row }) => formatDate(row.original.submittedAt) },
    ],
    [memberName, products.data],
  );
  return (
    <section aria-label="Export customers" className="customer-export-card tw:flex tw:flex-col tw:gap-4">
      <AdminSectionHeading
        title="Export Customers"
        description={`At most ${MAX_EXPORT_ROWS.toLocaleString("en-PH")} rows per file.`}
        actions={
          <div className="tw:flex tw:flex-wrap tw:items-end tw:gap-3">
            <SelectField label="Format" value={format} options={EXPORT_FORMAT_OPTIONS} onChange={setFormat} className="tw:w-full tw:sm:w-44" />
            <Button variant="teal" className="tw:min-h-11 tw:sm:min-h-8" loading={exporting} disabled={loading || rows.length === 0} onClick={onExport}>
              {exporting ? null : <Download aria-hidden="true" />} Export
            </Button>
          </div>
        }
      />
      <FilterBar
        search={search}
        onSearch={setSearch}
        searchLabel="Search customers by name"
        filters={[
          { label: "Status", value: status, onChange: setStatus, options: EXPORT_STATUS_OPTIONS },
          { label: "VIP card level", value: plan, onChange: setPlan, options: planOptions },
        ]}
      />
      <DataTable data={rows} columns={columns} getRowId={(row) => row.id} loading={loading} emptyText="No customers match." caption="Customers to Export" />
    </section>
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
      { id: "file", header: "File", cell: ({ row }) => <span className="tw:block tw:max-w-[10rem] tw:truncate tw:font-semibold" title={row.original.fileName}>{row.original.fileName}</span> },
      { id: "when", header: "Imported", meta: { className: "tw:hidden tw:lg:table-cell" }, cell: ({ row }) => new Date(row.original.createdAt).toLocaleString("en-PH", { timeZone: "Asia/Manila" }) },
      { id: "rows", header: "Rows", meta: { className: "tw:hidden tw:sm:table-cell" }, cell: ({ row }) => row.original.totalRows },
      { id: "created", header: "Drafts Created", meta: { className: "tw:hidden tw:sm:table-cell" }, cell: ({ row }) => row.original.createdCount },
      { id: "skipped", header: "Skipped", cell: ({ row }) => row.original.needsReviewCount + row.original.invalidCount },
    ],
    [],
  );
  const job = jobId ? jobs.find((item) => item.id === jobId) ?? null : null;
  return (
    <section aria-label="Job history" className="customer-history-card tw:flex tw:flex-col tw:gap-4">
      <AdminSectionHeading title="Job History" />
      <QueryState isLoading={isLoading} error={error}>
        <DataTable
          data={jobs}
          columns={columns}
          getRowId={(row) => row.id}
          emptyText="No imports yet."
          caption="Customer Import Jobs"
          onRowOpen={(row) => setJobId(row.id)}
          getRowLabel={(row) => `Open ${importJobLabel(row)}`}
        />
        <RecordDetailsSheet
          open={job !== null}
          onClose={() => setJobId(null)}
          title={job ? importJobLabel(job) : "Import Job"}
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
