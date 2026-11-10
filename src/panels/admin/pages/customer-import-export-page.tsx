"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CircleCheck, CircleX, Download, Hourglass, ListOrdered, Upload } from "lucide-react";
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
import { CheckboxField } from "@/shared/forms/modern";
import { downloadCsv, downloadXlsx, readSpreadsheet, SPREADSHEET_ACCEPT } from "@/shared/lib/spreadsheet";
import { Button, buttonVariants } from "@/shared/ui/button";
import { Label } from "@/shared/ui/label";
import { BizBadge } from "@/shared/components/business/biz-badge";
import { RecordDetailsSheet } from "@/shared/components/modern/record-details-sheet";
import { RowActionsMenu } from "@/shared/components/modern/row-actions-menu";
import { AdminPage, AdminStatCard, AdminStatGrid } from "@/shared/components/admin";
import { ExportCustomersCard, HistoryCard } from "../components/customer-export-history";
import { CustomerImportHowItWorks } from "../components/customer-import-how-it-works";
import { TemplateStep, UploadDropzone } from "../components/customer-import-steps";
import { CustomerImportTabs } from "../components/customer-import-tabs";

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
    <AdminPage
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
          <CustomerImportTabs value={tab} onChange={setTab} jobCount={jobs.data?.length ?? 0} />
          {tab === "import" ? <ImportPanel onImported={() => setTab("history")} /> : null}
          {tab === "export" ? <ExportPanel /> : null}
          {tab === "history" ? <HistoryPanel jobs={jobs.data ?? []} isLoading={jobs.isLoading} error={jobs.error} /> : null}
        </>
      ) : (
        <InfoNote title="Not available">Customer import and export are limited to Administrators.</InfoNote>
      )}
    </AdminPage>
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
      <CustomerImportHowItWorks />
      <TemplateStep
        step={1}
        title="Get the template"
        description="Required in every row: First name and Last name. Dates use YYYY-MM-DD. VIP tier accepts Bronze, Silver, Gold or B1, S1, G1. Payment scheme uses the register name. The Example sheet shows one filled row."
        connector
        actions={
          <>
            <Button variant="outline" className="tw:min-h-11 tw:sm:min-h-8" onClick={() => void downloadXlsx("customer-import-template.xlsx", [{ name: SHEET_NAME, rows: template }, { name: "Example", rows: [...template, EXAMPLE_ROW] }]).catch(() => toast.error("The template could not be created."))}>
              <Download aria-hidden="true" /> XLSX template
            </Button>
            <Button variant="outline" className="tw:min-h-11 tw:sm:min-h-8" onClick={() => downloadCsv("customer-import-template.csv", template)}>
              <Download aria-hidden="true" /> CSV template
            </Button>
          </>
        }
      />
      <TemplateStep
        step={2}
        title="Upload and review"
        description={<Label htmlFor="customer-import-file">Customer file (.xlsx or .csv, up to 10 MB)</Label>}
        connector={preview !== null}
      >
        <UploadDropzone
          inputId="customer-import-file"
          accept={SPREADSHEET_ACCEPT}
          disabled={importCustomers.isPending}
          reading={reading}
          error={fileError}
          onFile={(file) => void onFile(file)}
        />
        {preview ? (
          <div className="tw:mt-4 tw:flex tw:flex-col tw:gap-4">
            <AdminStatGrid>
              <AdminStatCard label="Rows" value={rows.length} icon={ListOrdered} tone="info" />
              <AdminStatCard label="Ready" value={counts.ready} icon={CircleCheck} tone="success" />
              <AdminStatCard label="Needs review" value={counts.review} icon={Hourglass} tone="warning" />
              <AdminStatCard label="Invalid" value={counts.invalid} icon={CircleX} tone="danger" />
            </AdminStatGrid>
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
      </TemplateStep>
      {preview ? (
        <TemplateStep step={3} title="Confirm">
          <div className="tw:flex tw:flex-col tw:gap-3">
            <CheckboxField label="I confirm these rows come from official company records." checked={declaration} onChange={setDeclaration} />
            <div>
              <Button className="tw:min-h-11 tw:sm:min-h-8" disabled={!declaration || counts.ready === 0 || importCustomers.isPending} onClick={() => void confirm()}>
                <Upload aria-hidden="true" /> {importCustomers.isPending ? "Importing…" : `Confirm import (${counts.ready} row${counts.ready === 1 ? "" : "s"})`}
              </Button>
            </div>
          </div>
        </TemplateStep>
      ) : null}
    </>
  );
}

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
    <ExportCustomersCard
      status={status}
      setStatus={setStatus}
      plan={plan}
      setPlan={setPlan}
      format={format}
      setFormat={setFormat}
      matchingCount={matching.length}
      loading={customers.isLoading}
      exporting={exportCustomers.isPending}
      onExport={() => void run()}
    />
  );
}

function HistoryPanel({ jobs, isLoading, error }: { jobs: CustomerImportJob[]; isLoading: boolean; error: unknown }) {
  const [jobId, setJobId] = useState<string | null>(null);
  return <HistoryCard jobs={jobs} isLoading={isLoading} error={error} jobId={jobId} setJobId={setJobId} />;
}
