"use client";

import { useMemo, useState } from "react";
import { CircleCheck, CircleX, Hourglass, ListOrdered, Upload } from "lucide-react";
import { toast } from "sonner";
import { useCustomerImportJobs, useExportCustomers, useImportCustomers, useOperation, usePaymentSchemes, useVipProducts } from "@/data/business-queries";
import { useCustomers } from "@/data/queries";
import {
  buildImportRows,
  CUSTOMER_IMPORT_COLUMNS,
  customerToExportRow,
  MAX_EXPORT_ROWS,
  rowsToImportRecords,
  type CustomerImportRecord,
  type CustomerImportRow,
} from "@/modules/customers/import";
import { DataTable, type ColumnDef } from "@/shared/components/modern/data-table";
import { InfoNote } from "@/shared/components/modern/detail-list";
import { CheckboxField } from "@/shared/forms/modern";
import { downloadCsv, downloadXlsx, readSpreadsheet, SPREADSHEET_ACCEPT } from "@/shared/lib/spreadsheet";
import { Button } from "@/shared/ui/button";
import { Label } from "@/shared/ui/label";
import { BizBadge } from "@/shared/components/business/biz-badge";
import { RecordDetailsSheet } from "@/shared/components/modern/record-details-sheet";
import { AdminStatCard, AdminStatGrid } from "@/shared/components/admin";
import { ExportCustomersCard, HistoryCard } from "../components/customer-export-history";
import { TemplateDownloadMenu, TemplateStep, UploadDropzone } from "../components/customer-import-steps";
import { defaultProductCode, tierDisplayName } from "@/modules/vip/tier-options";
import { customerRecordName } from "@/modules/customers/rules";

const SHEET_NAME = "Customers";
/** One filled-in row for the template; the VIP tier is a product code from the catalog. */
const exampleRow = (productCode: string) => ["", "Angela", "Ramos", "Bernardo", "", "1990-05-14", "Female", "Married", "09175820346", "angela.bernardo@gmail.com", "Blk 4 Lot 12, Rizal Street", "Laguna", "Calauan", "Poblacion", "4012", productCode, "4-Month Installment", "Standard", "Walk-In"];

const ROW_BADGE: Record<CustomerImportRow["status"], { status: string; label: string }> = {
  ready: { status: "verified", label: "Ready" },
  needs_review: { status: "on_hold", label: "Needs review" },
  invalid: { status: "rejected", label: "Invalid" },
};

type Preview = { fileName: string; records: CustomerImportRecord[] };

const NOT_AVAILABLE = <InfoNote title="Not Available">Customer import and export are limited to Administrators.</InfoNote>;

/** Import steps and the import job history. Needs `customers.import`; anyone else sees a "Not available" note. */
export function CustomerImportPanel() {
  const canImport = useOperation("customers.import");
  const jobs = useCustomerImportJobs(canImport);
  const [jobId, setJobId] = useState<string | null>(null);
  if (!canImport) return NOT_AVAILABLE;
  return (
    <section aria-label="Import customers" className="customer-import-panel tw:flex tw:flex-col tw:gap-4">
      <ImportSteps />
      <HistoryCard jobs={jobs.data ?? []} isLoading={jobs.isLoading} error={jobs.error} jobId={jobId} setJobId={setJobId} />
    </section>
  );
}

/** Customer export. Needs `customers.import`; anyone else sees a "Not available" note. */
export function CustomerExportPanel() {
  const canImport = useOperation("customers.import");
  if (!canImport) return NOT_AVAILABLE;
  return <ExportSteps />;
}

function ImportSteps() {
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
      { id: "name", header: "Customer", cell: ({ row }) => <span className="tw:block tw:max-w-36 tw:truncate tw:font-semibold" title={row.original.displayName}>{row.original.displayName}</span> },
      { id: "status", header: "Result", cell: ({ row }) => <BizBadge {...ROW_BADGE[row.original.status]} /> },
      { id: "issues", header: "Problems", meta: { className: "tw:hidden tw:sm:table-cell" }, cell: ({ row }) => row.original.errors.length + row.original.warnings.length || "—" },
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
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The import failed.");
    }
  };

  const template = [[...CUSTOMER_IMPORT_COLUMNS]];

  return (
    <>
      <TemplateStep
        step={1}
        title="Get the Template"
        description="First name and Last name are required. Dates use YYYY-MM-DD. The Example sheet shows one filled row."
        connector
        actions={
          <TemplateDownloadMenu
            onExcel={() => void downloadXlsx("customer-import-template.xlsx", [{ name: SHEET_NAME, rows: template }, { name: "Example", rows: [...template, exampleRow(defaultProductCode(products.data))] }]).catch(() => toast.error("The template could not be created."))}
            onCsv={() => downloadCsv("customer-import-template.csv", template)}
          />
        }
      />
      <TemplateStep
        step={2}
        title="Upload and Review"
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
              <AdminStatCard label="Needs Review" value={counts.review} icon={Hourglass} tone="warning" />
              <AdminStatCard label="Invalid" value={counts.invalid} icon={CircleX} tone="danger" />
            </AdminStatGrid>
            <DataTable
              data={rows}
              columns={columns}
              getRowId={(row) => String(row.rowNumber)}
              emptyText="The file has no data rows."
              caption={`Import Preview for ${preview.fileName}`}
              onRowOpen={(row) => setViewRowNumber(row.rowNumber)}
              getRowLabel={(row) => `Open import row ${row.rowNumber}`}
            />
            <RecordDetailsSheet
              open={viewRow !== null}
              onClose={() => setViewRowNumber(null)}
              title={viewRow ? `Row ${viewRow.rowNumber}: ${viewRow.displayName}` : "Import Row"}
              subtitle={preview.fileName}
              badge={viewRow ? <BizBadge {...ROW_BADGE[viewRow.status]} /> : undefined}
              sections={
                viewRow
                  ? [
                      { title: "Parsed Values", rows: [{ label: "VIP Card", value: tierDisplayName(viewRow.input.vipPlan, products.data) }, { label: "Payment plan", value: schemes.data?.find((item) => item.id === viewRow.input.paymentSchemeId)?.label ?? null }, { label: "Contract type", value: viewRow.input.contractClassification === "N" ? "Non-Standard" : viewRow.input.contractClassification === "S" ? "Standard" : null }] },
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
              <Button variant="success" className="tw:min-h-11 tw:sm:min-h-8" loading={importCustomers.isPending} disabled={!declaration || counts.ready === 0} onClick={() => void confirm()}>
                {importCustomers.isPending ? null : <Upload aria-hidden="true" />} {`Confirm Import (${counts.ready} row${counts.ready === 1 ? "" : "s"})`}
              </Button>
            </div>
          </div>
        </TemplateStep>
      ) : null}
    </>
  );
}

function ExportSteps() {
  const customers = useCustomers();
  const schemes = usePaymentSchemes();
  const exportCustomers = useExportCustomers();
  const [status, setStatus] = useState("all");
  const [plan, setPlan] = useState("all");
  const [format, setFormat] = useState<"xlsx" | "csv">("xlsx");
  const [search, setSearch] = useState("");

  // The preview table and the export file use these same rows.
  const matching = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (customers.data ?? []).filter(
      (customer) =>
        !customer.restricted &&
        (status === "all" || customer.status === status) &&
        (plan === "all" || customer.vipPlan === plan) &&
        (term === "" || customerRecordName(customer).toLowerCase().includes(term)),
    );
  }, [customers.data, status, plan, search]);

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
      rows={matching}
      search={search}
      setSearch={setSearch}
      status={status}
      setStatus={setStatus}
      plan={plan}
      setPlan={setPlan}
      format={format}
      setFormat={setFormat}
      loading={customers.isLoading}
      exporting={exportCustomers.isPending}
      onExport={() => void run()}
    />
  );
}
