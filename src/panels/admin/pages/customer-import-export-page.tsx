"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Download, Upload } from "lucide-react";
import { toast } from "sonner";
import { useCustomerImportJobs, useExportCustomers, useImportCustomers, useOperation, usePaymentSchemes, useVipProducts } from "@/data/business-queries";
import { useCustomers } from "@/data/queries";
import {
  buildImportRows,
  CUSTOMER_IMPORT_COLUMNS,
  customerToExportRow,
  MAX_EXPORT_ROWS,
  rowsToImportRecords,
  type CustomerImportJob,
  type CustomerImportRecord,
  type CustomerImportRow,
} from "@/modules/customers/import";
import { DataTable, type ColumnDef } from "@/shared/components/modern/data-table";
import { InfoNote } from "@/shared/components/modern/detail-list";
import { CheckboxField, SelectField } from "@/shared/forms/modern";
import { downloadCsv, downloadXlsx, readSpreadsheet, SPREADSHEET_ACCEPT } from "@/shared/lib/spreadsheet";
import { Button, buttonVariants } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { BizBadge } from "@/shared/components/business/biz-badge";
import { QueryState } from "@/shared/components/modern/query-state";
import { RecordDetailsSheet } from "@/shared/components/modern/record-details-sheet";
import { RowActionsMenu } from "@/shared/components/modern/row-actions-menu";
import { Section } from "@/shared/components/modern/section";
import { StatTiles } from "@/shared/components/modern/stat-tiles";
import { TabBar } from "@/shared/components/modern/tab-bar";
import { ModulePage } from "../components/module-page";

const SHEET_NAME = "Customers";
const EXAMPLE_ROW = ["", "Maria", "Reyes", "Santos", "", "1990-05-14", "Female", "Married", "09171234567", "maria.santos@example.com", "123 Rizal Street", "Laguna", "Calauan", "Poblacion", "4012", "G1", "4-Month Installment", "Standard", "Walk-In"];

const ROW_BADGE: Record<CustomerImportRow["status"], { status: string; label: string }> = {
  ready: { status: "verified", label: "Ready" },
  needs_review: { status: "on_hold", label: "Needs review" },
  invalid: { status: "rejected", label: "Invalid" },
};

type Preview = { fileName: string; records: CustomerImportRecord[] };

export function CustomerImportExportPage() {
  const canImport = useOperation("customers.import");
  const [tab, setTab] = useState("import");
  const jobs = useCustomerImportJobs(canImport);

  return (
    <ModulePage
      anyOf={["customers"]}
      title="Customer Import and Export"
      description="Bring company customer records in as drafts, or export customer records."
      crumbs={[{ label: "Sales" }, { label: "Customer Import" }]}
      actions={
        <Link href="/admin/customers" className={buttonVariants({ variant: "outline", className: "tw:min-h-11 tw:sm:min-h-8" })}>
          Customers
        </Link>
      }
    >
      {canImport ? (
        <>
          <TabBar label="Import and export views" value={tab} onChange={setTab} tabs={[{ value: "import", label: "Import" }, { value: "export", label: "Export" }, { value: "history", label: "Job history", count: jobs.data?.length }]} />
          {tab === "import" ? <ImportPanel onImported={() => setTab("history")} /> : null}
          {tab === "export" ? <ExportPanel /> : null}
          {tab === "history" ? <HistoryPanel jobs={jobs.data ?? []} isLoading={jobs.isLoading} error={jobs.error} /> : null}
        </>
      ) : (
        <InfoNote title="Not available">Customer import and export are limited to Administrators.</InfoNote>
      )}
    </ModulePage>
  );
}

function ImportPanel({ onImported }: { onImported: () => void }) {
  const customers = useCustomers();
  const products = useVipProducts();
  const schemes = usePaymentSchemes();
  const importCustomers = useImportCustomers();
  const [preview, setPreview] = useState<Preview | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const [declaration, setDeclaration] = useState(false);

  const rows = useMemo(
    () => (preview ? buildImportRows(preview.records, { existing: customers.data ?? [], products: products.data ?? [], schemes: schemes.data ?? [] }) : []),
    [preview, customers.data, products.data, schemes.data],
  );
  const [viewRowNumber, setViewRowNumber] = useState<number | null>(null);
  const viewRow = viewRowNumber === null ? null : rows.find((row) => row.rowNumber === viewRowNumber) ?? null;
  const counts = useMemo(() => ({ ready: rows.filter((row) => row.status === "ready").length, review: rows.filter((row) => row.status === "needs_review").length, invalid: rows.filter((row) => row.status === "invalid").length }), [rows]);

  const columns = useMemo<ColumnDef<CustomerImportRow, unknown>[]>(
    () => [
      { id: "row", header: "Row", cell: ({ row }) => row.original.rowNumber },
      { id: "name", header: "Customer", cell: ({ row }) => <span className="tw:font-semibold">{row.original.displayName}</span> },
      { id: "status", header: "Result", cell: ({ row }) => <BizBadge {...ROW_BADGE[row.original.status]} /> },
      {
        id: "issues",
        header: "Issues",
        cell: ({ row }) => (
          <ul className="tw:space-y-0.5 tw:text-xs">
            {row.original.errors.map((message) => <li key={message} className="tw:text-destructive">{message}</li>)}
            {row.original.warnings.map((message) => <li key={message} className="tw:text-muted-foreground">{message}</li>)}
            {row.original.errors.length + row.original.warnings.length === 0 ? <li className="tw:text-muted-foreground">None</li> : null}
          </ul>
        ),
      },
    ],
    [],
  );

  const onFile = async (file: File | undefined) => {
    setPreview(null);
    setFileError(null);
    setDeclaration(false);
    if (!file) return;
    setReading(true);
    try {
      setPreview({ fileName: file.name, records: rowsToImportRecords(await readSpreadsheet(file, SHEET_NAME)) });
    } catch (error) {
      setFileError(error instanceof Error ? error.message : "The file could not be read.");
    } finally {
      setReading(false);
    }
  };

  const confirm = async () => {
    if (!preview) return;
    try {
      const job = await importCustomers.mutateAsync({ fileName: preview.fileName, records: preview.records, declaration });
      toast.success(`${job.createdCount} draft customer(s) created. ${job.needsReviewCount + job.invalidCount} row(s) skipped.`);
      setPreview(null);
      setDeclaration(false);
      onImported();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The import failed.");
    }
  };

  const template = [[...CUSTOMER_IMPORT_COLUMNS]];

  return (
    <>
      <InfoNote title="How import works">
        Each valid row becomes a customer draft. Staff then open the draft, confirm the details, tick both certifications and submit it. Rows that may duplicate an existing customer are skipped and listed for review; nothing is merged or overwritten. Nothing is saved until you confirm.
      </InfoNote>
      <Section
        title="1. Get the template"
        actions={
          <div className="tw:flex tw:flex-wrap tw:gap-2">
            <Button variant="outline" className="tw:min-h-11 tw:sm:min-h-8" onClick={() => void downloadXlsx("customer-import-template.xlsx", [{ name: SHEET_NAME, rows: template }, { name: "Example", rows: [...template, EXAMPLE_ROW] }]).catch(() => toast.error("The template could not be created."))}>
              <Download aria-hidden="true" /> XLSX template
            </Button>
            <Button variant="outline" className="tw:min-h-11 tw:sm:min-h-8" onClick={() => downloadCsv("customer-import-template.csv", template)}>
              <Download aria-hidden="true" /> CSV template
            </Button>
          </div>
        }
      >
        <p className="tw:text-sm tw:text-muted-foreground">
          Required in every row: First name and Last name. Dates use YYYY-MM-DD. VIP tier accepts Bronze, Silver, Gold or B1, S1, G1. Payment scheme uses the register name. The Example sheet shows one filled row.
        </p>
      </Section>
      <Section title="2. Upload and review">
        <div className="tw:flex tw:flex-col tw:gap-2 tw:sm:max-w-md">
          <Label htmlFor="customer-import-file">Customer file (.xlsx or .csv, up to 10 MB)</Label>
          <Input id="customer-import-file" type="file" accept={SPREADSHEET_ACCEPT} disabled={reading || importCustomers.isPending} onChange={(event) => void onFile(event.target.files?.[0])} aria-describedby={fileError ? "customer-import-file-error" : undefined} />
          {reading ? <p role="status" className="tw:text-sm tw:text-muted-foreground">Reading the file…</p> : null}
          {fileError ? <p id="customer-import-file-error" role="alert" className="tw:text-sm tw:text-destructive">{fileError}</p> : null}
        </div>
        {preview ? (
          <div className="tw:mt-4 tw:flex tw:flex-col tw:gap-4">
            <StatTiles items={[{ label: "Rows", value: rows.length }, { label: "Ready", value: counts.ready }, { label: "Needs review", value: counts.review }, { label: "Invalid", value: counts.invalid }]} />
            <DataTable
              data={rows}
              columns={columns}
              getRowId={(row) => String(row.rowNumber)}
              emptyText="The file has no data rows."
              caption={`Import preview for ${preview.fileName}`}
              onRowOpen={(row) => setViewRowNumber(row.rowNumber)}
              getRowLabel={(row) => `Open import row ${row.rowNumber}`}
              rowActions={(row) => <RowActionsMenu itemName={`import row ${row.rowNumber}`} onView={() => setViewRowNumber(row.rowNumber)} />}
            />
            <RecordDetailsSheet
              open={viewRow !== null}
              onClose={() => setViewRowNumber(null)}
              title={viewRow ? `Row ${viewRow.rowNumber}: ${viewRow.displayName}` : "Import row"}
              subtitle={preview.fileName}
              badge={viewRow ? <BizBadge {...ROW_BADGE[viewRow.status]} /> : undefined}
              sections={
                viewRow
                  ? [
                      { title: "Parsed values", rows: [{ label: "VIP card", value: viewRow.input.vipPlan }, { label: "Payment scheme", value: viewRow.input.paymentSchemeId }, { label: "Classification", value: viewRow.input.contractClassification }] },
                      { title: "Problems", rows: [...viewRow.errors.map((message, index) => ({ label: index === 0 ? "Errors" : "", value: <span className="tw:text-destructive">{message}</span> })), ...viewRow.warnings.map((message, index) => ({ label: index === 0 ? "Warnings" : "", value: message }))] },
                    ]
                  : []
              }
            />
          </div>
        ) : null}
      </Section>
      {preview ? (
        <Section title="3. Confirm">
          <div className="tw:flex tw:flex-col tw:gap-3">
            <CheckboxField label="I confirm these rows come from official company records." checked={declaration} onChange={setDeclaration} />
            <div>
              <Button className="tw:min-h-11 tw:sm:min-h-8" disabled={!declaration || counts.ready === 0 || importCustomers.isPending} onClick={() => void confirm()}>
                <Upload aria-hidden="true" /> {importCustomers.isPending ? "Importing…" : `Confirm import (${counts.ready} row${counts.ready === 1 ? "" : "s"})`}
              </Button>
            </div>
          </div>
        </Section>
      ) : null}
    </>
  );
}

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "draft", label: "Draft" },
  { value: "submitted", label: "Submitted" },
  { value: "active_member", label: "Active member" },
  { value: "inactive", label: "Inactive" },
];
const PLAN_OPTIONS = [
  { value: "all", label: "All VIP tiers" },
  { value: "B1", label: "Bronze (B1)" },
  { value: "S1", label: "Silver (S1)" },
  { value: "G1", label: "Gold (G1)" },
];

function ExportPanel() {
  const customers = useCustomers();
  const schemes = usePaymentSchemes();
  const exportCustomers = useExportCustomers();
  const [status, setStatus] = useState("all");
  const [plan, setPlan] = useState("all");
  const [format, setFormat] = useState<"xlsx" | "csv">("xlsx");

  const matching = useMemo(
    () => (customers.data ?? []).filter((customer) => !customer.restricted && (status === "all" || customer.status === status) && (plan === "all" || customer.vipPlan === plan)),
    [customers.data, status, plan],
  );

  const run = async () => {
    try {
      // The repository re-reads the records the identity may see; the filters are applied to that result.
      const allowed = new Set(matching.map((customer) => customer.id));
      const records = (await exportCustomers.mutateAsync({ format, count: Math.min(matching.length, MAX_EXPORT_ROWS) })).filter((customer) => allowed.has(customer.id)).slice(0, MAX_EXPORT_ROWS);
      const rows = [[...CUSTOMER_IMPORT_COLUMNS, "Status"], ...records.map((customer) => [...customerToExportRow(customer, schemes.data ?? []), customer.status])];
      const fileName = `customers-${new Date().toISOString().slice(0, 10)}.${format}`;
      if (format === "xlsx") await downloadXlsx(fileName, [{ name: SHEET_NAME, rows }]);
      else downloadCsv(fileName, rows);
      toast.success(`${records.length} customer(s) exported.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The export failed.");
    }
  };

  return (
    <Section title="Export customers" description={`Exports use the template columns. At most ${MAX_EXPORT_ROWS.toLocaleString("en-PH")} rows per file. Every export is recorded in the audit log.`}>
      <div className="tw:grid tw:grid-cols-1 tw:gap-3 tw:sm:grid-cols-3">
        <SelectField label="Status" value={status} options={STATUS_OPTIONS} onChange={setStatus} />
        <SelectField label="VIP tier" value={plan} options={PLAN_OPTIONS} onChange={setPlan} />
        <SelectField label="Format" value={format} options={[{ value: "xlsx", label: "Excel (.xlsx)" }, { value: "csv", label: "CSV (.csv)" }]} onChange={setFormat} />
      </div>
      <div className="tw:mt-4 tw:flex tw:flex-wrap tw:items-center tw:gap-3">
        <Button className="tw:min-h-11 tw:sm:min-h-8" disabled={customers.isLoading || matching.length === 0 || exportCustomers.isPending} onClick={() => void run()}>
          <Download aria-hidden="true" /> {exportCustomers.isPending ? "Exporting…" : "Export"}
        </Button>
        <span className="tw:text-sm tw:text-muted-foreground" role="status">{matching.length} matching customer(s)</span>
      </div>
    </Section>
  );
}

function HistoryPanel({ jobs, isLoading, error }: { jobs: CustomerImportJob[]; isLoading: boolean; error: unknown }) {
  const columns = useMemo<ColumnDef<CustomerImportJob, unknown>[]>(
    () => [
      { id: "id", header: "Job", cell: ({ row }) => <span className="tw:font-semibold">{row.original.id}</span> },
      { id: "file", header: "File", meta: { className: "tw:hidden tw:sm:table-cell" }, cell: ({ row }) => row.original.fileName },
      { id: "when", header: "Imported", meta: { className: "tw:hidden tw:md:table-cell" }, cell: ({ row }) => new Date(row.original.createdAt).toLocaleString("en-PH", { timeZone: "Asia/Manila" }) },
      { id: "created", header: "Drafts created", cell: ({ row }) => `${row.original.createdCount} of ${row.original.totalRows}` },
      { id: "skipped", header: "Skipped", cell: ({ row }) => `${row.original.needsReviewCount} for review, ${row.original.invalidCount} invalid` },
    ],
    [],
  );
  const [jobId, setJobId] = useState<string | null>(null);
  const job = jobId ? jobs.find((item) => item.id === jobId) ?? null : null;
  return (
    <Section title="Job history" description="Recent customer imports, newest first.">
      <QueryState isLoading={isLoading} error={error}>
        <DataTable
          data={jobs}
          columns={columns}
          getRowId={(row) => row.id}
          emptyText="No imports yet."
          caption="Customer import jobs"
          onRowOpen={(row) => setJobId(row.id)}
          getRowLabel={(row) => `Open import job ${row.id}`}
          rowActions={(row) => <RowActionsMenu itemName={`import job ${row.id}`} onView={() => setJobId(row.id)} />}
        />
        <RecordDetailsSheet
          open={job !== null}
          onClose={() => setJobId(null)}
          title={job ? `Import ${job.id}` : "Import job"}
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
    </Section>
  );
}
