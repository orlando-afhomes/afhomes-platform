import type { PaymentScheme, VipProduct, VipTierCode } from "@/modules/vip/types";
import { isValidEmail, isValidPhilippineMobile, isValidPostalCode, normalizePhilippineMobile } from "@/shared/utils/input-sanitizers";
import { composeCustomerName, validateCustomerForSubmit } from "./rules";
import { ACQUISITION_CHANNELS, CUSTOMER_CIVIL_STATUSES, CUSTOMER_GENDERS, type Customer, type CustomerDraftInput } from "./types";

/**
 * Customer import (doc 04 sections 13 and 14; owner rulings 2026-11-09).
 * Imported rows become customer DRAFTS only: staff open each draft, check it,
 * tick both certifications and Submit. Possible duplicates are never merged or
 * overwritten; they are skipped and listed for manual review (04 section 14).
 */
export const CUSTOMER_IMPORT_COLUMNS = [
  "Customer ID",
  "First name",
  "Middle name",
  "Last name",
  "Suffix",
  "Birth date",
  "Gender",
  "Civil status",
  "Mobile number",
  "Email",
  "Address line 1",
  "Province",
  "City / Municipality",
  "Barangay",
  "Postal code",
  "VIP tier",
  "Payment scheme",
  "Contract classification",
  "Acquisition channel",
] as const;

export type CustomerImportColumn = (typeof CUSTOMER_IMPORT_COLUMNS)[number];
export type CustomerImportRecord = Partial<Record<CustomerImportColumn, string>>;

/** shortcut: one file is capped at 1,000 rows in the mock; raise or batch when the backend import exists. */
export const MAX_IMPORT_ROWS = 1_000;
export const MAX_EXPORT_ROWS = 5_000;

export type ImportRowStatus = "ready" | "needs_review" | "invalid";

export type CustomerImportRow = {
  /** Spreadsheet row number, counting the header as row 1. */
  rowNumber: number;
  displayName: string;
  status: ImportRowStatus;
  input: CustomerDraftInput;
  errors: string[];
  warnings: string[];
};

export type CustomerImportJob = {
  id: string;
  fileName: string;
  createdAt: string;
  actorId: string;
  totalRows: number;
  createdCount: number;
  needsReviewCount: number;
  invalidCount: number;
  createdCustomerIds: string[];
};

type ImportContext = { existing: readonly Customer[]; products: readonly VipProduct[]; schemes: readonly PaymentScheme[] };

const TIER_ALIASES: Record<string, VipTierCode> = { b1: "B1", bronze: "B1", s1: "S1", silver: "S1", g1: "G1", gold: "G1" };
const CLASSIFICATION_ALIASES: Record<string, "S" | "N"> = { s: "S", standard: "S", n: "N", "non-standard": "N", nonstandard: "N" };
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const CERTIFICATION_KEYS = new Set(["consentDataPrivacy", "idReceivedCertified"]);

/** Spreadsheet cell to trimmed text. Excel dates become YYYY-MM-DD from their UTC parts (no timezone shift). */
export function cellToText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return "";
    return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, "0")}-${String(value.getUTCDate()).padStart(2, "0")}`;
  }
  return String(value).trim();
}

/** Minimal RFC 4180 CSV reader: quoted fields, escaped quotes, CRLF or LF, optional BOM. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const source = text.replace(/^﻿/, "");
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (quoted) {
      if (char === '"' && source[index + 1] === '"') { field += '"'; index += 1; }
      else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"') quoted = true;
    else if (char === ",") { row.push(field); field = ""; }
    else if (char === "\n" || char === "\r") {
      if (char === "\r" && source[index + 1] === "\n") index += 1;
      row.push(field); rows.push(row); row = []; field = "";
    } else field += char;
  }
  if (field !== "" || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
}

/** Header row plus data rows to records. Throws when a required header is missing. Empty rows are dropped. */
export function rowsToImportRecords(rows: readonly (readonly unknown[])[]): CustomerImportRecord[] {
  if (rows.length === 0) throw new Error("The file is empty.");
  const header = rows[0].map((cell) => cellToText(cell).toLowerCase());
  const indexOf = new Map<CustomerImportColumn, number>();
  for (const column of CUSTOMER_IMPORT_COLUMNS) {
    const position = header.indexOf(column.toLowerCase());
    if (position >= 0) indexOf.set(column, position);
  }
  const missing = (["First name", "Last name"] as const).filter((column) => !indexOf.has(column));
  if (missing.length > 0) throw new Error(`The file is missing the column(s): ${missing.join(", ")}. Use the template.`);
  const records = rows.slice(1).map((cells) => {
    const record: CustomerImportRecord = {};
    for (const [column, position] of indexOf) record[column] = cellToText(cells[position]);
    return record;
  });
  while (records.length > 0 && Object.values(records.at(-1)!).every((value) => !value)) records.pop();
  if (records.length > MAX_IMPORT_ROWS) throw new Error(`A file may contain at most ${MAX_IMPORT_ROWS.toLocaleString("en-PH")} rows.`);
  return records;
}

function pick<T extends string>(value: string, options: readonly T[]): T | undefined {
  return options.find((option) => option.toLowerCase() === value.toLowerCase());
}

/** A 10-digit number starting with 9 lost its leading 0 in a spreadsheet; restore it. */
function normalizeImportedMobile(value: string): string {
  const digits = value.replace(/\D/g, "");
  return normalizePhilippineMobile(digits.length === 10 && digits.startsWith("9") ? `0${digits}` : digits);
}

function isPastDate(value: string): boolean {
  if (!DATE_ONLY.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCMonth() === month - 1 && date.getUTCDate() === day && date.getTime() < Date.now();
}

/** Maps one record to a draft input with errors (row skipped) and warnings (fix before Submit). */
function mapRecord(record: CustomerImportRecord, context: ImportContext) {
  const errors: string[] = [];
  const text = (column: CustomerImportColumn) => (record[column] ?? "").trim();
  const input: CustomerDraftInput = { displayName: "" };

  input.firstName = text("First name");
  input.lastName = text("Last name");
  if (!input.firstName) errors.push("First name is required.");
  if (!input.lastName) errors.push("Last name is required.");
  input.middleName = text("Middle name") || null;
  input.suffix = text("Suffix") || null;
  for (const [label, value] of [["First name", input.firstName], ["Last name", input.lastName]] as const) {
    if (value.length > 80) errors.push(`${label} must be 80 characters or fewer.`);
  }

  const customerNumber = text("Customer ID");
  if (customerNumber.length > 40) errors.push("Customer ID must be 40 characters or fewer.");
  input.customerNumber = customerNumber || null;

  const birth = text("Birth date");
  if (birth && !isPastDate(birth)) errors.push("Birth date must be a past date in YYYY-MM-DD format.");
  input.dateOfBirth = birth || null;

  const gender = text("Gender");
  input.gender = gender ? pick(gender, CUSTOMER_GENDERS) ?? null : null;
  if (gender && !input.gender) errors.push("Gender must be Male or Female.");

  const civil = text("Civil status");
  input.civilStatus = civil ? pick(civil, CUSTOMER_CIVIL_STATUSES) ?? null : null;
  if (civil && !input.civilStatus) errors.push(`Civil status must be one of: ${CUSTOMER_CIVIL_STATUSES.join(", ")}.`);

  const mobile = text("Mobile number");
  input.mobileNumber = mobile ? normalizeImportedMobile(mobile) : null;
  if (mobile && !isValidPhilippineMobile(input.mobileNumber ?? "")) errors.push("Mobile number must be an 11-digit number starting with 09.");

  const email = text("Email").toLowerCase();
  input.email = email || null;
  if (email && !isValidEmail(email)) errors.push("Email address is not valid.");

  const postalCode = text("Postal code");
  if (postalCode && !isValidPostalCode(postalCode)) errors.push("Postal code must be 4 digits.");
  const street = text("Address line 1");
  const province = text("Province");
  const city = text("City / Municipality");
  const barangay = text("Barangay");
  for (const [label, value, max] of [["Address line 1", street, 160], ["Province", province, 100], ["City / Municipality", city, 100], ["Barangay", barangay, 100]] as const) {
    if (value.length > max) errors.push(`${label} must be ${max} characters or fewer.`);
  }
  input.address = street || province || city || barangay || postalCode ? { street, province, city, barangay, subdivision: "", postalCode } : null;

  const tier = text("VIP tier");
  input.vipPlan = tier ? TIER_ALIASES[tier.toLowerCase()] ?? null : null;
  if (tier && !input.vipPlan) errors.push("VIP tier must be Bronze (B1), Silver (S1) or Gold (G1).");
  else if (input.vipPlan && !context.products.some((product) => product.code === input.vipPlan && product.status === "active")) errors.push("The VIP tier is not available.");

  const warnings: string[] = [];
  const schemeText = text("Payment scheme").toLowerCase();
  const scheme = schemeText ? context.schemes.find((item) => item.label.toLowerCase() === schemeText || item.historicalLabel?.toLowerCase() === schemeText) : undefined;
  input.paymentSchemeId = scheme?.id ?? null;
  if (schemeText && !scheme) errors.push("Payment scheme is not in the official register.");
  else if (scheme && scheme.availability !== "available") warnings.push(`Payment scheme "${scheme.label}" is not currently available.`);
  else if (scheme && input.vipPlan && !scheme.applicableTiers.includes(input.vipPlan)) warnings.push(`Payment scheme "${scheme.label}" does not apply to this VIP tier.`);

  const classification = text("Contract classification");
  input.contractClassification = classification ? CLASSIFICATION_ALIASES[classification.toLowerCase()] ?? null : null;
  if (classification && !input.contractClassification) errors.push("Contract classification must be Standard or Non-Standard.");

  const channel = text("Acquisition channel");
  input.acquisitionChannel = channel ? pick(channel, ACQUISITION_CHANNELS) ?? null : null;
  if (channel && !input.acquisitionChannel) errors.push(`Acquisition channel must be one of: ${ACQUISITION_CHANNELS.join(", ")}.`);

  input.consentDataPrivacy = false;
  input.idReceivedCertified = false;
  input.displayName = composeCustomerName(input);
  return { input, errors, warnings };
}

type Identity = { email: string | null; mobile: string | null; nameBirth: string | null };

function identityOf(input: Pick<CustomerDraftInput, "email" | "mobileNumber" | "firstName" | "lastName" | "dateOfBirth">): Identity {
  const first = (input.firstName ?? "").trim().toLowerCase();
  const last = (input.lastName ?? "").trim().toLowerCase();
  return {
    email: input.email?.trim().toLowerCase() || null,
    mobile: input.mobileNumber ? normalizePhilippineMobile(input.mobileNumber) : null,
    nameBirth: first && last && input.dateOfBirth ? `${first}|${last}|${input.dateOfBirth}` : null,
  };
}

/** Reasons a row may be the same person as an earlier record. Never decides; only flags for review. */
function duplicateReasons(candidate: Identity, others: readonly Identity[]): string[] {
  const reasons = new Set<string>();
  for (const other of others) {
    if (candidate.email && candidate.email === other.email) reasons.add("the same email");
    if (candidate.mobile && candidate.mobile === other.mobile) reasons.add("the same mobile number");
    if (candidate.nameBirth && candidate.nameBirth === other.nameBirth) reasons.add("the same name and birth date");
  }
  return [...reasons];
}

/**
 * Classifies every record. Used for the preview and again by the repository on
 * Confirm (the repository never trusts the preview). Invalid rows and possible
 * duplicates are skipped; only "ready" rows become drafts.
 */
export function buildImportRows(records: readonly CustomerImportRecord[], context: ImportContext): CustomerImportRow[] {
  const existingIdentities = context.existing.map(identityOf);
  const existingNumbers = new Set(context.existing.map((customer) => customer.customerNumber?.trim().toLowerCase()).filter(Boolean));
  const seenIdentities: Identity[] = [];
  const seenNumbers = new Set<string>();

  return records.map((record, index) => {
    const { input, errors, warnings } = mapRecord(record, context);
    const number = input.customerNumber?.trim().toLowerCase();
    if (number && existingNumbers.has(number)) errors.push("This Customer ID is already in use.");
    else if (number && seenNumbers.has(number)) errors.push("This Customer ID appears more than once in the file.");
    if (number) seenNumbers.add(number);

    const identity = identityOf(input);
    const review: string[] = [];
    const existingMatch = duplicateReasons(identity, existingIdentities);
    if (existingMatch.length > 0) review.push(`Possible duplicate of an existing customer (${existingMatch.join(", ")}).`);
    const fileMatch = duplicateReasons(identity, seenIdentities);
    if (fileMatch.length > 0) review.push(`Possible duplicate of an earlier row (${fileMatch.join(", ")}).`);
    seenIdentities.push(identity);

    // Invalid rows are skipped, so their Submit gaps are noise; list them for rows that will become drafts.
    const beforeSubmit = errors.length > 0 ? [] : Object.entries(validateCustomerForSubmit(input, context.existing))
      .filter(([key]) => !CERTIFICATION_KEYS.has(key) && key !== "customerNumber")
      .map(([, message]) => `Before Submit: ${message}`);

    const status: ImportRowStatus = errors.length > 0 ? "invalid" : review.length > 0 ? "needs_review" : "ready";
    return { rowNumber: index + 2, displayName: input.displayName || "(no name)", status, input, errors: [...errors, ...review], warnings: [...warnings, ...beforeSubmit] };
  });
}

/** Spreadsheet formula injection guard for exported text (=, +, -, @, tab, carriage return). */
export function safeSpreadsheetText(value: string): string {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

/** One export row in template column order, so an export can be reviewed against the template. */
export function customerToExportRow(customer: Customer, schemes: readonly PaymentScheme[]): string[] {
  const scheme = schemes.find((item) => item.id === customer.paymentSchemeId);
  const values: Record<CustomerImportColumn, string> = {
    "Customer ID": customer.customerNumber ?? "",
    "First name": customer.firstName ?? "",
    "Middle name": customer.middleName ?? "",
    "Last name": customer.lastName ?? "",
    Suffix: customer.suffix ?? "",
    "Birth date": customer.dateOfBirth ?? "",
    Gender: customer.gender ?? "",
    "Civil status": customer.civilStatus ?? "",
    "Mobile number": customer.mobileNumber ?? "",
    Email: customer.email ?? "",
    "Address line 1": customer.address?.street ?? "",
    Province: customer.address?.province ?? "",
    "City / Municipality": customer.address?.city ?? "",
    Barangay: customer.address?.barangay ?? "",
    "Postal code": customer.address?.postalCode ?? "",
    "VIP tier": customer.vipPlan ?? "",
    "Payment scheme": scheme?.label ?? "",
    "Contract classification": customer.contractClassification === "S" ? "Standard" : customer.contractClassification === "N" ? "Non-Standard" : "",
    "Acquisition channel": customer.acquisitionChannel ?? "",
  };
  return CUSTOMER_IMPORT_COLUMNS.map((column) => safeSpreadsheetText(values[column]));
}
