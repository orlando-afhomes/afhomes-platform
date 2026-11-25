import { z } from "zod";
import type { PrepareContractInput } from "@/data/contracts/contract-repository";
import type { SubmitPaymentInput } from "@/data/contracts/payment-repository";
import type { CustomerDraftInput } from "@/modules/customers/types";
import { PAYMENT_METHODS, PAYMENT_PURPOSES } from "@/modules/finance/types";
import { normalizeId } from "@/server/repositories/records";

/** An internal id in either UUID spelling, normalised to the database form. */
export const idField = z.string().refine((value) => normalizeId(value) !== null, "Not a valid id.").transform((value) => normalizeId(value)!);

const text = z.string().max(200);
const optText = text.nullable().optional();
const flatObject = z.record(z.string(), z.union([z.string().max(200), z.boolean(), z.null(), z.array(z.string().max(20))]).optional());
const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use the date format YYYY-MM-DD.");

// Unknown keys are refused. File uploads (government ID image) arrive with the file-storage step, not here.
export const CustomerBody = z.strictObject({
  displayName: text.default(""),
  ownerMemberId: idField.nullable().optional(),
  branchId: text.optional(),
  customerNumber: optText,
  customerIdMode: z.enum(["auto", "manual"]).optional(),
  firstName: optText, middleName: optText, noMiddleName: z.boolean().optional(), lastName: optText, suffix: optText, prefix: optText,
  gender: optText, civilStatus: optText, dateOfBirth: optText, mobileNumber: optText, email: optText,
  address: flatObject.nullable().optional(), officeAddress: flatObject.nullable().optional(),
  governmentIdType: optText, governmentIdNumber: optText, tinNumber: optText,
  citizenship: optText, citizenshipCodes: z.array(z.string().max(10)).max(10).nullable().optional(),
  landline: optText, occupation: optText, businessIndustry: optText, employedPosition: optText,
  vipPlan: z.string().max(20).nullable().optional(), paymentSchemeId: optText, contractClassification: z.enum(["S", "N"]).nullable().optional(),
  supplementaryHolder: flatObject.nullable().optional(),
  recommenderMemberId: idField.nullable().optional(), referrerMemberId: idField.nullable().optional(),
  referralReference: optText, acquisitionChannel: optText, consentDataPrivacy: z.boolean().optional(), idReceivedCertified: z.boolean().optional(),
}).transform((value) => value as unknown as CustomerDraftInput);

export const PrepareContractBody = z.strictObject({
  customerId: idField,
  newPurchaseRequestId: z.string().max(100).optional(),
  schemeId: z.string().min(1).max(100),
  productCode: z.string().max(20).optional(),
  classification: z.enum(["S", "N"]).optional(),
  sellerMemberId: idField.optional(),
  referrerMemberId: idField.nullable().optional(),
  reservationDate: dateOnly.optional(),
  dueDates: z.record(z.string().regex(/^\d+$/), dateOnly.or(z.literal(""))).optional(),
  customerAccepted: z.boolean(),
  nonStandardTerms: z.unknown().optional(),
}).transform((value) => value as unknown as PrepareContractInput);

export const SubmitPaymentBody = z.strictObject({
  contractId: idField,
  purpose: z.enum(PAYMENT_PURPOSES as unknown as [string, ...string[]]),
  amountCentavos: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  method: z.enum(PAYMENT_METHODS as unknown as [string, ...string[]]),
  paidDate: dateOnly,
  documentNo: z.string().max(100).nullable().optional(),
  evidenceFileName: z.string().max(200).nullable().optional(),
  bankId: z.string().max(100).nullable().optional(),
}).transform((value) => value as unknown as SubmitPaymentInput);

export const VerifyPaymentBody = z.strictObject({ exceptionReason: z.string().max(500).optional() }).default({});

export const CustomerListQuery = z.object({ limit: z.coerce.number().int().min(1).max(100).default(50), after: idField.optional() });
export const CollectionsQuery = z.object({ from: dateOnly, to: dateOnly }).refine((value) => value.from <= value.to, "The start date must not be after the end date.");

/** Paging for lists of views: up to 500 per page, cursor = the last id of the previous page. */
export const PageQuery = z.object({ limit: z.coerce.number().int().min(1).max(500).default(100), after: idField.optional() });

/** One report export audit event: name, format, range and row count only, never row data. */
export const ReportExportBody = z.strictObject({
  report: z.string().min(1).max(120),
  format: z.enum(["xlsx", "csv", "pdf"]),
  range: z.object({ from: dateOnly, to: dateOnly }).refine((value) => value.from <= value.to, "The start date must not be after the end date.").nullable(),
  rowCount: z.number().int().min(0).max(100_000),
});
