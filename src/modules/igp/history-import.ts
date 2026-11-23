import { cellToText, MAX_IMPORT_ROWS } from "@/modules/customers/import";
import { parsePesoToCentavos } from "@/shared/lib/money";
import { parseManilaDateOnly } from "@/shared/lib/dates";
import { igpPriceBand, igpSeriesNumberProblem, parseIgpSeriesNumber } from "./rules";
import type { IgpClauses, IgpScheme } from "./types";

/**
 * IGP history import (IGP-2; doc 14 amendment 2026-11-22, decision 2).
 * Imported rows are history kept for reference: they never become live sales, receipts or commissions,
 * never issue a VIP Number, and their Series Numbers are reserved so they are never reused.
 * SUPERSEDED means Replaced: such a row must name its replacing Series Number in the Replaces column.
 */
export const IGP_HISTORY_COLUMNS = [
  "Series Number",
  "Issue date",
  "Contract price",
  "Payment plan",
  "Term months",
  "Contract type",
  "Buyer",
  "Status",
  "Replaces",
] as const;
export type IgpHistoryColumn = (typeof IGP_HISTORY_COLUMNS)[number];
export type IgpHistoryRecord = Partial<Record<IgpHistoryColumn, string>>;

export const IGP_HISTORY_EXAMPLE_ROW = [
  "A26111500012T12S", "2026-11-15", "1800000.00", "Terms", "12", "Standard", "Sample Buyer", "Active", "",
];

export type IgpHistoryRowStatus = "ready" | "invalid";

export type IgpHistoryImportRow = {
  rowNumber: number;
  status: IgpHistoryRowStatus;
  row: {
    rowNumber: number;
    seriesNumber: string;
    date: string;
    priceCentavos: number;
    scheme: IgpScheme;
    termMonths: number;
    clauses: IgpClauses;
    buyerLabel: string;
    status: "active" | "cancelled" | "replaced";
    replaces: string | null;
  } | null;
  errors: string[];
};

type ImportContext = {
  /** Series Numbers already on record (live sales plus earlier import batches); never reused. */
  taken: readonly string[];
  /** Asia/Manila date-only today; issue dates after it are refused. */
  today: string;
};

/** Header row plus data rows to records. Throws when a required header is missing. Empty rows are dropped. */
export function rowsToIgpHistoryRecords(rows: readonly (readonly unknown[])[]): IgpHistoryRecord[] {
  if (rows.length === 0) throw new Error("The file is empty.");
  const header = rows[0].map((cell) => cellToText(cell).toLowerCase());
  const indexOf = new Map<IgpHistoryColumn, number>();
  for (const column of IGP_HISTORY_COLUMNS) {
    const position = header.indexOf(column.toLowerCase());
    if (position >= 0) indexOf.set(column, position);
  }
  const missing = (["Series Number", "Issue date", "Contract price", "Status"] as const).filter((column) => !indexOf.has(column));
  if (missing.length > 0) throw new Error(`The file is missing the column(s): ${missing.join(", ")}. Use the template.`);
  const records = rows.slice(1).map((cells) => {
    const record: IgpHistoryRecord = {};
    for (const [column, position] of indexOf) record[column] = cellToText(cells[position]);
    return record;
  });
  while (records.length > 0 && Object.values(records.at(-1)!).every((value) => !value)) records.pop();
  if (records.length > MAX_IMPORT_ROWS) throw new Error(`A file may contain at most ${MAX_IMPORT_ROWS.toLocaleString("en-PH")} rows.`);
  return records;
}

function pickScheme(value: string): IgpScheme | undefined {
  const wanted = value.toLowerCase().replace(/[\s_-]+/g, "");
  if (["c", "cash"].includes(wanted)) return "C";
  if (["t", "terms", "term", "installment"].includes(wanted)) return "T";
  return undefined;
}

function pickClauses(value: string): IgpClauses | undefined {
  const wanted = value.toLowerCase().replace(/[\s_-]+/g, "");
  if (["s", "standard"].includes(wanted)) return "S";
  if (["n", "nonstandard"].includes(wanted)) return "N";
  return undefined;
}

function pickStatus(value: string): "active" | "cancelled" | "replaced" | undefined {
  const wanted = value.toLowerCase().replace(/[\s_-]+/g, "");
  if (wanted === "active") return "active";
  if (["cancelled", "canceled"].includes(wanted)) return "cancelled";
  if (["superseded", "replaced"].includes(wanted)) return "replaced";
  return undefined;
}

/**
 * Validates every record. Used for the preview and again by the repository on Confirm (the repository
 * never trusts the preview). Invalid rows are skipped; only "ready" rows are imported. Existing records
 * are never merged or overwritten: a repeated Series Number is an error.
 */
export function buildIgpHistoryImportRows(records: readonly IgpHistoryRecord[], context: ImportContext): IgpHistoryImportRow[] {
  const taken = new Set(context.taken.map((number) => number.trim().toUpperCase()));
  const seen = new Set<string>();

  const rows = records.map((record, index) => {
    const text = (column: IgpHistoryColumn) => (record[column] ?? "").trim();
    const errors: string[] = [];
    const rowNumber = index + 2;

    const seriesNumber = text("Series Number").toUpperCase();
    const formatProblem = seriesNumber ? igpSeriesNumberProblem(seriesNumber) : "Series Number is required.";
    if (formatProblem) {
      errors.push(formatProblem);
    } else if (taken.has(seriesNumber)) {
      errors.push("This Series Number is already on record. It is never reused.");
    } else if (seen.has(seriesNumber)) {
      errors.push("This Series Number appears more than once in the file.");
    }
    if (seriesNumber) seen.add(seriesNumber);
    const parsedSeries = formatProblem ? null : parseIgpSeriesNumber(seriesNumber);

    const date = text("Issue date");
    if (!parseManilaDateOnly(date)) errors.push("Issue date must be a real date in YYYY-MM-DD format.");
    else if (date > context.today) errors.push("Issue date cannot be in the future.");
    else if (parsedSeries && date !== parsedSeries.datePart) {
      errors.push(`Issue date must match the date in the Series Number (${parsedSeries.datePart}).`);
    }

    const priceCentavos = parsePesoToCentavos(text("Contract price"));
    if (priceCentavos === null || priceCentavos <= 0) errors.push("Contract price must be greater than zero, for example 1800000.00.");

    const scheme = pickScheme(text("Payment plan"));
    if (!scheme) errors.push("Payment plan must be Cash or Terms.");
    else if (parsedSeries && scheme !== parsedSeries.scheme) {
      errors.push(`Payment plan must match the Series Number (${parsedSeries.scheme === "C" ? "Cash" : "Terms"}).`);
    }
    const termMonths = Number(text("Term months"));
    if (!Number.isInteger(termMonths) || termMonths < 1 || termMonths > 36) errors.push("Term months must be a whole number from 1 to 36.");
    else if (parsedSeries && termMonths !== parsedSeries.termMonths) {
      errors.push(`Term months must match the Series Number (${parsedSeries.termMonths}).`);
    } else if (!parsedSeries && scheme === "C" && termMonths !== 1) errors.push("Cash uses one month: enter 1 for the term.");
    const clauses = pickClauses(text("Contract type"));
    if (!clauses) errors.push("Contract type must be Standard or Non-Standard.");
    else if (parsedSeries && clauses !== parsedSeries.clauses) {
      errors.push(`Contract type must match the Series Number (${parsedSeries.clauses === "S" ? "Standard" : "Non-Standard"}).`);
    }

    if (parsedSeries && priceCentavos !== null && priceCentavos > 0) {
      const { band } = parsedSeries;
      if (band !== igpPriceBand(priceCentavos)) {
        errors.push(
          `The band digit ${band} does not match the contract price (band ${igpPriceBand(priceCentavos)}). Use 0 for a price above ₱9,000,000.`,
        );
      }
    }

    const buyerLabel = text("Buyer");
    if (!buyerLabel) errors.push("Buyer is required.");
    else if (buyerLabel.length > 120) errors.push("Buyer must be 120 characters or fewer.");

    const status = pickStatus(text("Status"));
    if (!status) errors.push("Status must be Active, Cancelled or SUPERSEDED (a replaced number).");

    // 2026-11-22 ruling: SUPERSEDED means Replaced. The row must name its replacing Series Number.
    const replaces = text("Replaces").toUpperCase() || null;
    if (status === "replaced") {
      if (!replaces) {
        errors.push("This row is SUPERSEDED but names no replacement. Enter the replacing Series Number in the Replaces column.");
      } else if (replaces === seriesNumber) {
        errors.push("The Replaces number must be a different Series Number from this row.");
      } else {
        const replacesProblem = igpSeriesNumberProblem(replaces);
        if (replacesProblem) errors.push(`The Replaces number is not valid: ${replacesProblem}`);
        // Existence is checked in the second pass below, against existing
        // records and rows that will actually be imported (review fix
        // 2026-11-23): a link to a skipped row must fail.
      }
    } else if (replaces) {
      errors.push("Only a SUPERSEDED row names a replacement. Clear the Replaces column or set the Status to SUPERSEDED.");
    }

    if (errors.length > 0 || priceCentavos === null || !scheme || !clauses || !status) {
      return { rowNumber, status: "invalid" as const, row: null, errors };
    }
    return {
      rowNumber,
      status: "ready" as const,
      errors,
      row: { rowNumber, seriesNumber, date, priceCentavos, scheme, termMonths, clauses, buyerLabel, status, replaces },
    };
  });

  // Trace each chain once. Any failure also invalidates all rows leading to it.
  const importable = new Map<string, NonNullable<IgpHistoryImportRow["row"]>>();
  for (const { row } of rows) {
    if (row) importable.set(row.seriesNumber, row);
  }
  const results = new Map<string, "missing" | "circular" | null>();
  for (const start of importable.keys()) {
    if (results.has(start)) continue;
    const path = new Set<string>();
    let current: string | null = start;
    let problem: "missing" | "circular" | null = null;
    while (current && !taken.has(current)) {
      if (path.has(current)) { problem = "circular"; break; }
      if (results.has(current)) { problem = results.get(current) ?? null; break; }
      const row: IgpHistoryImportRow["row"] | undefined = importable.get(current);
      if (!row) { problem = "missing"; break; }
      path.add(current);
      current = row.replaces;
    }
    for (const number of path) results.set(number, problem);
  }
  return rows.map((item) => {
    if (!item.row) return item;
    const problem = results.get(item.row.seriesNumber);
    if (!problem) return item;
    const target = item.row.replaces;
    let error: string;
    if (problem === "circular") {
      error = "The Replaces link leads to a circular replacement chain. Enter the correct replacement Series Number.";
    } else if (target && importable.has(target)) {
      error = `The replacement chain through ${target} is incomplete. Fix the missing link before importing this row.`;
    } else {
      error = `The Replaces number ${target} is not in this file or on record as a valid replacement. Import the replacement row too, or fix the number.`;
    }
    return { rowNumber: item.rowNumber, status: "invalid" as const, row: null, errors: [error] };
  });
}
