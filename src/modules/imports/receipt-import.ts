import { findReferenceConflict } from "@/modules/finance/rules";
import { PAYMENT_METHODS, PAYMENT_PURPOSES, type Payment, type PaymentMethod, type PaymentPurpose } from "@/modules/finance/types";
import { cellToText, MAX_IMPORT_ROWS } from "@/modules/customers/import";
import { parseManilaDateOnly } from "@/modules/accreditation/dates";
import { parsePesoToCentavos } from "@/shared/lib/money";

/**
 * Historical receipt import (docs 07 section 20, 11 section 26, 12 section 21.2; owner rulings R11 item 5 and
 * follow-up 8, 2026-11-12). Only receipts of UNFINISHED sales come in; finished sales stay in the Excel
 * archives. Imported receipts are stored apart from live payments, never overwrite a payment, never allocate
 * a VIP Number and never trigger a commission. They count only after an Administrator signs off the batch.
 */
export const RECEIPT_IMPORT_COLUMNS = [
  "Receipt reference",
  "Receipt date",
  "Amount",
  "Payment method",
  "Purpose",
  "Customer",
  "Sale reference",
  "Sale status",
  "Remarks",
] as const;
export type ReceiptImportColumn = (typeof RECEIPT_IMPORT_COLUMNS)[number];
export type ReceiptImportRecord = Partial<Record<ReceiptImportColumn, string>>;

export const RECEIPT_IMPORT_EXAMPLE_ROW = ["OR-2026-000123", "2026-10-15", "25000.00", "Cash", "Down Payment", "Sample Customer", "SALE-EXAMPLE-1", "Unfinished", ""];

export const IMPORTED_STATUS_LABEL = "Approved (imported)";

export type ReceiptImportBatchStatus = "pending_signoff" | "signed_off" | "rejected";

/** A receipt that came in through a history import batch. It is marked Approved (imported) once the batch is signed off. */
export type ImportedReceipt = {
  id: string;
  batchId: string;
  /** Spreadsheet row number, counting the header as row 1. */
  rowNumber: number;
  referenceNo: string;
  /** Business date on the receipt, kept as imported (YYYY-MM-DD). */
  paidDate: string;
  amountCentavos: number;
  method: PaymentMethod;
  purpose: PaymentPurpose | null;
  customerLabel: string;
  saleReference: string;
  remarks: string | null;
};

export type ReceiptImportSkippedRow = { rowNumber: number; reason: string };

export type ReceiptImportBatch = {
  id: string;
  fileName: string;
  createdAt: string;
  createdBy: string;
  status: ReceiptImportBatchStatus;
  totalRows: number;
  receipts: ImportedReceipt[];
  skipped: ReceiptImportSkippedRow[];
  decidedBy: string | null;
  decidedAt: string | null;
  /** Required reason when the whole batch is rejected. */
  decisionReason: string | null;
  /** True when the signer also prepared the batch; flagged like a self-approved receipt (doc 07 section 5). */
  selfSignedOff: boolean;
};

export type ReceiptImportRowStatus = "ready" | "invalid";

export type ReceiptImportRow = {
  rowNumber: number;
  status: ReceiptImportRowStatus;
  receipt: Omit<ImportedReceipt, "id" | "batchId"> | null;
  errors: string[];
};

export function importedReceiptStatusLabel(batchStatus: ReceiptImportBatchStatus): string {
  if (batchStatus === "signed_off") return IMPORTED_STATUS_LABEL;
  return batchStatus === "rejected" ? "Rejected (batch)" : "Imported, awaiting sign-off";
}

/** Receipts that count as approved: only those of a signed-off batch. */
export function countedImportedReceipts(batches: readonly ReceiptImportBatch[]): ImportedReceipt[] {
  return batches.filter((batch) => batch.status === "signed_off").flatMap((batch) => batch.receipts);
}

/** Header row plus data rows to records. Throws when a required header is missing. Empty rows are dropped. */
export function rowsToReceiptRecords(rows: readonly (readonly unknown[])[]): ReceiptImportRecord[] {
  if (rows.length === 0) throw new Error("The file is empty.");
  const header = rows[0].map((cell) => cellToText(cell).toLowerCase());
  const indexOf = new Map<ReceiptImportColumn, number>();
  for (const column of RECEIPT_IMPORT_COLUMNS) {
    const position = header.indexOf(column.toLowerCase());
    if (position >= 0) indexOf.set(column, position);
  }
  const missing = (["Receipt reference", "Receipt date", "Amount", "Payment method", "Customer", "Sale reference", "Sale status"] as const).filter((column) => !indexOf.has(column));
  if (missing.length > 0) throw new Error(`The file is missing the column(s): ${missing.join(", ")}. Use the template.`);
  const records = rows.slice(1).map((cells) => {
    const record: ReceiptImportRecord = {};
    for (const [column, position] of indexOf) record[column] = cellToText(cells[position]);
    return record;
  });
  while (records.length > 0 && Object.values(records.at(-1)!).every((value) => !value)) records.pop();
  if (records.length > MAX_IMPORT_ROWS) throw new Error(`A file may contain at most ${MAX_IMPORT_ROWS.toLocaleString("en-PH")} rows.`);
  return records;
}

function pick<T extends string>(value: string, options: readonly T[]): T | undefined {
  const wanted = value.toLowerCase().replace(/[\s_-]+/g, "");
  return options.find((option) => option.toLowerCase().replace(/[\s_-]+/g, "") === wanted);
}

/** Anything not clearly unfinished is refused: finished sales are not imported (doc 11 section 26). */
const UNFINISHED_STATUSES = new Set(["unfinished", "open", "ongoing"]);

type ImportContext = {
  /** Live payments: a reference is unique across the whole system (doc 07 section 9.2). */
  payments: readonly Pick<Payment, "id" | "referenceNo">[];
  /** Batches already on record. A rejected batch frees its references so a corrected file can be imported again. */
  batches: readonly ReceiptImportBatch[];
  /** Asia/Manila date-only today; receipt dates after it are refused. */
  today: string;
};

/**
 * Validates every record. Used for the preview and again by the repository on Confirm (the repository never
 * trusts the preview). Invalid rows are skipped; only "ready" rows become imported receipts. Existing records
 * are never merged or overwritten: a repeated reference is an error.
 */
export function buildReceiptImportRows(records: readonly ReceiptImportRecord[], context: ImportContext): ReceiptImportRow[] {
  const taken = new Set<string>();
  for (const batch of context.batches) {
    if (batch.status === "rejected") continue;
    for (const receipt of batch.receipts) taken.add(receipt.referenceNo.trim().toLowerCase());
  }
  const seen = new Set<string>();

  return records.map((record, index) => {
    const text = (column: ReceiptImportColumn) => (record[column] ?? "").trim();
    const errors: string[] = [];

    const referenceNo = text("Receipt reference");
    const key = referenceNo.toLowerCase();
    if (!referenceNo) errors.push("Receipt reference is required.");
    else if (referenceNo.length > 60) errors.push("Receipt reference must be 60 characters or fewer.");
    else if (findReferenceConflict(context.payments as Payment[], referenceNo)) errors.push("This receipt reference is already used by a payment on record. It is not overwritten.");
    else if (taken.has(key)) errors.push("This receipt reference is already in another import batch.");
    else if (seen.has(key)) errors.push("This receipt reference appears more than once in the file.");
    if (referenceNo) seen.add(key);

    const paidDate = text("Receipt date");
    if (!parseManilaDateOnly(paidDate)) errors.push("Receipt date must be a real date in YYYY-MM-DD format.");
    else if (paidDate > context.today) errors.push("Receipt date cannot be in the future.");

    const amountCentavos = parsePesoToCentavos(text("Amount"));
    if (amountCentavos === null || amountCentavos <= 0) errors.push("Amount must be greater than zero, for example 25000.00.");

    const method = pick(text("Payment method"), PAYMENT_METHODS);
    if (!method) errors.push(`Payment method must be one of: ${PAYMENT_METHODS.join(", ")}.`);

    const purposeText = text("Purpose");
    const purpose = purposeText ? pick(purposeText, PAYMENT_PURPOSES) ?? null : null;
    if (purposeText && !purpose) errors.push(`Purpose must be one of: ${PAYMENT_PURPOSES.join(", ")}.`);

    const customerLabel = text("Customer");
    if (!customerLabel) errors.push("Customer is required.");
    else if (customerLabel.length > 120) errors.push("Customer must be 120 characters or fewer.");

    const saleReference = text("Sale reference");
    if (!saleReference) errors.push("Sale reference is required.");
    else if (saleReference.length > 60) errors.push("Sale reference must be 60 characters or fewer.");

    const saleStatus = text("Sale status").toLowerCase();
    if (!UNFINISHED_STATUSES.has(saleStatus)) errors.push("Only receipts of unfinished sales are imported. Finished sales stay in the Excel archives.");

    const remarks = text("Remarks");
    if (remarks.length > 200) errors.push("Remarks must be 200 characters or fewer.");

    const rowNumber = index + 2;
    if (errors.length > 0 || amountCentavos === null || !method) return { rowNumber, status: "invalid" as const, receipt: null, errors };
    return {
      rowNumber,
      status: "ready" as const,
      errors,
      receipt: { rowNumber, referenceNo, paidDate, amountCentavos, method, purpose, customerLabel, saleReference, remarks: remarks || null },
    };
  });
}
