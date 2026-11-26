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
const money = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);
const positiveMoney = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);

/** Non-Standard price, number of monthly payments (1 to 12, owner amendment 2026-11-24) and reason. */
const NonStandardTermsBody = z.strictObject({
  priceCentavos: positiveMoney,
  months: z.number().int().min(1).max(12),
  justification: z.string().min(1).max(500),
});

// Unknown keys are refused. The government ID image is uploaded through its own file endpoint.
const customerFields = {
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
};

export const CustomerBody = z.strictObject(customerFields).transform((value) => value as unknown as CustomerDraftInput);

export const CustomerCorrectBody = z.strictObject({ ...customerFields, reason: z.string().min(1).max(500) })
  .transform((value) => value as unknown as CustomerDraftInput & { reason: string });

export const CustomerReviewBody = z.strictObject({ reason: z.string().min(1).max(500) });

export const CustomerImportBody = z.strictObject({
  fileName: z.string().min(1).max(200),
  records: z.array(z.record(z.string(), z.string().max(500))).min(1).max(1_000),
  declaration: z.boolean(),
});

export const CustomerExportBody = z.strictObject({ format: z.enum(["xlsx", "csv", "pdf"]), count: z.number().int().min(0).max(5_000) });

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
  nonStandardTerms: NonStandardTermsBody.optional(),
}).transform((value) => value as unknown as PrepareContractInput);

export const UpdateContractBody = z.strictObject({
  dueDates: z.record(z.string().regex(/^\d+$/), dateOnly.or(z.literal(""))).optional(),
  customerAccepted: z.boolean().optional(),
  nonStandardTerms: NonStandardTermsBody.optional(),
});

export const CancellationRequestBody = z.strictObject({
  ground: z.enum(["non_payment", "false_information", "voluntary_withdrawal"]),
  reason: z.string().min(1).max(500),
});

export const CancellationDecisionBody = z.strictObject({
  decision: z.enum(["confirm", "decline"]),
  reason: z.string().min(1).max(500),
});

export const ReferenceBody = z.strictObject({ reference: z.string().min(1).max(200) });

export const SaleCommissionCorrectionBody = z.strictObject({
  referrerMemberId: idField.nullable().optional(),
  dscRateBp: z.number().int().min(0).max(10_000).optional(),
  driRateBp: z.number().int().min(0).max(10_000).optional(),
  reason: z.string().min(1).max(500),
});

/** The Director-style status change for a sale (Commission System User Manual; doc 08 §14.1). */
export const SaleStatusChangeBody = z.strictObject({
  status: z.enum(["rescinded", "downgraded"]),
  reason: z.string().min(1).max(500),
});

// ---------------------------------------------------------------- finance lifecycle (F5)
const paymentMethod = z.enum(PAYMENT_METHODS as unknown as [string, ...string[]]);
const paymentPurpose = z.enum(PAYMENT_PURPOSES as unknown as [string, ...string[]]);

export const PaymentResubmitBody = z.strictObject({
  purpose: paymentPurpose.optional(),
  amountCentavos: positiveMoney.optional(),
  method: paymentMethod.optional(),
  paidDate: dateOnly.optional(),
  referenceNo: z.string().max(60).nullable().optional(),
  documentNo: z.string().max(60).nullable().optional(),
  evidenceFileName: z.string().max(200).nullable().optional(),
  bankId: z.string().max(60).nullable().optional(),
});

export const PaymentAdjustBody = z.strictObject({
  kind: z.enum(["reversal", "refund"]),
  amountCentavos: positiveMoney,
  reason: z.string().min(1).max(500),
});

export const UnmatchedReceiptBody = z.strictObject({
  amountCentavos: positiveMoney,
  method: paymentMethod,
  paidDate: dateOnly,
  orNumber: z.string().min(1).max(60),
  reason: z.string().min(1).max(500),
  evidenceFileName: z.string().max(200).nullable().optional(),
});

export const MatchUnmatchedBody = z.strictObject({
  contractId: idField,
  purpose: paymentPurpose,
  note: z.string().max(500).nullable().optional(),
});

export const ClosedMonthBody = z.strictObject({ month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Use the month format YYYY-MM.") });

export const ReceiptImportCreateBody = z.strictObject({
  fileName: z.string().min(1).max(200),
  records: z.array(z.record(z.string(), z.string().max(500))).min(1).max(1_000),
  declaration: z.boolean(),
});

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

// ---------------------------------------------------------------- organization (F1)
const orgName = z.string().min(1).max(120);
const orgEmail = z.string().min(3).max(200);
const profileFields = {
  firstName: optText, prefix: optText, middleName: optText, lastName: optText, suffix: optText,
  mobileNumber: optText, street: optText, province: optText, city: optText, barangay: optText,
  postalCode: optText, telephone: optText, facebook: optText, tin: optText, gender: optText,
  civilStatus: optText, governmentIdType: optText, governmentIdNumber: optText,
};

export const DepartmentBody = z.strictObject({
  name: orgName,
  code: z.string().max(20).optional(),
  description: z.string().max(500).optional(),
  headStaffId: idField.nullable().optional(),
  status: z.enum(["active", "deactivated"]).optional(),
});
export const DepartmentPatch = DepartmentBody.partial();

export const DepartmentRoleBody = z.strictObject({
  name: orgName,
  departmentId: idField,
  moduleIds: z.array(z.string().max(50)).min(1).max(50),
  status: z.enum(["active", "deactivated"]).optional(),
});
export const DepartmentRolePatch = z.strictObject({
  name: orgName.optional(),
  departmentId: idField.optional(),
  moduleIds: z.array(z.string().max(50)).min(1).max(50).optional(),
  status: z.enum(["active", "deactivated"]).optional(),
});

export const StaffBody = z.strictObject({
  displayName: orgName,
  position: z.string().max(120),
  departmentId: idField.nullable().optional(),
  departmentRoleId: idField.nullable().optional(),
  email: orgEmail,
  avatarUrl: z.string().max(500).nullable().optional(),
  accountId: idField.nullable().optional(),
  provisionPendingAccount: z.boolean().optional(),
  systemRoleIds: z.array(z.string().max(30)).max(20).optional(),
  ...profileFields,
});
export const StaffPatch = z.strictObject({
  displayName: orgName.optional(),
  position: z.string().max(120).optional(),
  departmentId: idField.nullable().optional(),
  departmentRoleId: idField.nullable().optional(),
  email: orgEmail.optional(),
  avatarUrl: z.string().max(500).nullable().optional(),
  accountId: idField.nullable().optional(),
  ...profileFields,
});

export const AccountBody = z.strictObject({
  displayName: orgName,
  email: orgEmail,
  roleIds: z.array(z.string().max(30)).max(20),
  departmentId: idField.nullable().optional(),
});
export const AccountPatch = z.strictObject({
  displayName: orgName.optional(),
  email: orgEmail.optional(),
  departmentId: idField.nullable().optional(),
});
export const AccountRoleBody = z.strictObject({ role: z.string().min(1).max(30) });
export const AccountStatusBody = z.strictObject({ status: z.enum(["pending", "active", "suspended", "deactivated"]) });
export const StaffStatusBody = z.strictObject({ status: z.enum(["active", "suspended", "deactivated"]) });

// ---------------------------------------------------------------- sales network (F2)
const designation = z.enum(["SVD", "SSM", "SM", "OST"]);
const salesStatus = z.enum(["active", "inactive", "suspended"]);

export const MemberBody = z.strictObject({
  displayName: orgName,
  designation,
  parentId: idField.nullable(),
  branchId: z.string().max(100).optional(),
  status: salesStatus.optional(),
  accountId: idField.nullable().optional(),
  aaNumber: z.string().max(20).nullable().optional(),
  mockAccreditationEligible: z.boolean().optional(),
  teamName: z.string().max(120).nullable().optional(),
});

export const MemberPatch = z.strictObject({
  displayName: orgName.optional(),
  firstName: z.string().max(120).optional(),
  middleName: z.string().max(120).nullable().optional(),
  noMiddleName: z.boolean().optional(),
  lastName: z.string().max(120).optional(),
  suffix: z.string().max(20).nullable().optional(),
  mobileNumber: z.string().max(30).optional(),
  dateOfBirth: dateOnly.optional(),
  email: orgEmail.optional(),
  street: z.string().max(200).optional(),
  province: z.string().max(120).optional(),
  city: z.string().max(120).optional(),
  barangay: z.string().max(120).optional(),
  postalCode: z.string().max(20).optional(),
  telephone: z.string().max(30).nullable().optional(),
  facebook: z.string().max(200).nullable().optional(),
  tin: z.string().max(30).nullable().optional(),
  businessEmployer: z.string().max(200).nullable().optional(),
  businessAddress: z.string().max(300).nullable().optional(),
  jobPosition: z.string().max(120).nullable().optional(),
  gender: z.string().max(30).optional(),
  civilStatus: z.string().max(30).optional(),
  governmentIdType: z.string().max(60).optional(),
  governmentIdNumber: z.string().max(60).optional(),
  cardApplicationDate: dateOnly.optional(),
  programCategory: z.string().max(60).optional(),
  vipCardLevel: z.string().max(10).optional(),
});

export const MemberTransferBody = z.strictObject({
  newParentId: idField.nullable(),
  designation: designation.optional(),
  teamName: z.string().max(120).nullable().optional(),
});

export const MemberStatusBody = z.strictObject({ status: salesStatus });

export const SeatVacancyBody = z.strictObject({ holderEndDate: dateOnly });
export const FillVacancyBody = z.strictObject({ method: z.enum(["promotion", "transfer"]), filledOn: dateOnly, newHolderMemberId: idField });

export const ApplicantBody = z.strictObject({
  firstName: z.string().max(120), middleName: z.string().max(120), noMiddleName: z.boolean(), lastName: z.string().max(120), suffix: z.string().max(20),
  mobileNumber: z.string().max(30), email: orgEmail, dateOfBirth: dateOnly,
  street: z.string().max(200), province: z.string().max(120), city: z.string().max(120), barangay: z.string().max(120), postalCode: z.string().max(20),
});

export const RegistrationBody = z.strictObject({ referralCode: z.string().min(1).max(60), applicant: ApplicantBody });
export const ResubmitBody = z.strictObject({ applicant: ApplicantBody });

export const RegistrationCompletionBody = z.strictObject({
  gender: z.string().max(30), civilStatus: z.string().max(30), governmentIdType: z.string().max(60), governmentIdNumber: z.string().max(60),
  cardApplicationDate: dateOnly, programCategory: z.string().max(60), vipCardLevel: z.string().max(10), profilePhotoName: z.string().max(200),
});

export const DecisionBody = z.strictObject({ reason: z.string().min(1).max(500) });
export const ApproveRegistrationBody = z.strictObject({ approvedStart: dateOnly });
export const AccreditationIssueBody = z.strictObject({ memberId: idField });
export const AccreditationStatusBody = z.strictObject({
  requested: z.enum(["pending", "active", "cancel", "expired"]),
  expectedPrevious: z.enum(["pending", "active", "suspended", "revoked", "cancelled"]).optional(),
  reason: z.string().max(500).optional(),
});
export const AccreditationRenewBody = z.strictObject({ renewalDate: dateOnly.optional(), expectedAaNumber: z.string().max(20).optional() });

// ---------------------------------------------------------------- catalog (F4)
const tierCodeMap = z.record(z.string().max(10), z.string().max(10));
const tierCodeAmounts = z.record(z.string().max(10), money);
const tierCodeCounts = z.record(z.string().max(10), z.number().int().min(1).max(60));

export const TierLevelBody = z.strictObject({
  name: z.string().min(1).max(80),
  colorKey: z.enum(["bronze", "silver", "gold", "neutral"]),
  sortOrder: z.number().int().min(1).max(1000).optional(),
});

export const TierLevelPatch = z.strictObject({
  name: z.string().min(1).max(80).optional(),
  colorKey: z.enum(["bronze", "silver", "gold", "neutral"]).optional(),
  sortOrder: z.number().int().min(1).max(1000).optional(),
  status: z.enum(["active", "inactive"]).optional(),
});

const productTermFields = {
  name: z.string().min(1).max(120),
  tierLevelId: z.string().min(1).max(100),
  priceCentavos: positiveMoney,
  validityYears: z.number().int().min(1).max(50),
  earningCycles: z.number().int().min(1).max(50),
  vipDiscountPercent: z.number().int().min(0).max(100),
  lifetimePoints: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  pointsPerCycle: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  weekdayPointsPerCycle: money,
  weekendPointsPerCycle: money,
  minSpendPerCycleCentavos: money,
  supplementaryHolders: z.number().int().min(0).max(20),
};

export const ProductBody = z.strictObject({
  code: z.string().min(1).max(10),
  ...productTermFields,
  description: z.string().max(500).nullable().optional(),
  benefitsSummary: z.string().max(500).nullable().optional(),
  imageUrl: z.string().max(500).nullable().optional(),
  imageFileName: z.string().max(200).nullable().optional(),
  publiclyListed: z.boolean().optional(),
});

export const ProductPatch = z.strictObject({
  name: productTermFields.name.optional(),
  tierLevelId: productTermFields.tierLevelId.optional(),
  priceCentavos: productTermFields.priceCentavos.optional(),
  validityYears: productTermFields.validityYears.optional(),
  earningCycles: productTermFields.earningCycles.optional(),
  vipDiscountPercent: productTermFields.vipDiscountPercent.optional(),
  lifetimePoints: productTermFields.lifetimePoints.optional(),
  pointsPerCycle: productTermFields.pointsPerCycle.optional(),
  weekdayPointsPerCycle: productTermFields.weekdayPointsPerCycle.optional(),
  weekendPointsPerCycle: productTermFields.weekendPointsPerCycle.optional(),
  minSpendPerCycleCentavos: productTermFields.minSpendPerCycleCentavos.optional(),
  supplementaryHolders: productTermFields.supplementaryHolders.optional(),
  description: z.string().max(500).nullable().optional(),
  benefitsSummary: z.string().max(500).nullable().optional(),
  imageUrl: z.string().max(500).nullable().optional(),
  imageFileName: z.string().max(200).nullable().optional(),
  publiclyListed: z.boolean().optional(),
  status: z.enum(["active", "retired"]).optional(),
  priceStatus: z.enum(["contract_stated", "conflict"]).optional(),
});

export const PaymentSchemeBody = z.strictObject({
  label: z.string().min(1).max(120),
  paymentCode: z.string().max(10).nullable().optional(),
  paymentCodeByTier: tierCodeMap.optional(),
  applicableTiers: z.array(z.string().max(10)).max(50).optional(),
  reservationCentavos: positiveMoney.nullable().optional(),
  installmentCount: z.number().int().min(1).max(60).nullable().optional(),
  installmentCentavosByTier: tierCodeAmounts.optional(),
  priceCentavosByTier: tierCodeAmounts.optional(),
  installmentCountByTier: tierCodeCounts.optional(),
  downPaymentBasisPoints: z.number().int().min(1).max(9_999).nullable().optional(),
  availability: z.enum(["available", "unavailable"]).optional(),
});

export const PaymentSchemePatch = z.strictObject({
  label: z.string().min(1).max(120).optional(),
  paymentCode: z.string().max(10).nullable().optional(),
  paymentCodeByTier: tierCodeMap.optional(),
  applicableTiers: z.array(z.string().max(10)).max(50).optional(),
  reservationCentavos: positiveMoney.nullable().optional(),
  installmentCount: z.number().int().min(1).max(60).nullable().optional(),
  installmentCentavosByTier: tierCodeAmounts.optional(),
  priceCentavosByTier: tierCodeAmounts.optional(),
  installmentCountByTier: tierCodeCounts.optional(),
  downPaymentBasisPoints: z.number().int().min(1).max(9_999).nullable().optional(),
  availability: z.enum(["available", "unavailable"]).optional(),
});

export const ReasonBody = z.strictObject({ reason: z.string().min(1).max(500) });

// ---------------------------------------------------------------- property sales (IGP; F4)
const igpPayment = z.strictObject({
  amountCentavos: positiveMoney,
  method: z.enum(PAYMENT_METHODS as unknown as [string, ...string[]]),
  paidDate: dateOnly,
  documentNo: optText,
});

const igpIntake = {
  projectId: idField,
  unitId: idField,
  priceCentavos: positiveMoney,
  scheme: z.enum(["C", "T"]),
  termMonths: z.number().int().min(1).max(36),
  clauses: z.enum(["S", "N"]),
  sellerMemberId: idField,
  referrerMemberId: idField.nullable(),
  referralReference: z.string().max(200).optional(),
  entry: z.enum(["reservation", "cts"]),
  date: dateOnly,
};

const cashTermMonths = (value: { scheme: string; termMonths: number }, ctx: z.RefinementCtx) => {
  if (value.scheme === "C" && value.termMonths !== 1) ctx.addIssue({ code: "custom", path: ["termMonths"], message: "Cash uses one month." });
};

const IgpRecordBody = z.strictObject({ customerId: idField, ...igpIntake, payment: igpPayment }).superRefine(cashTermMonths);

const IgpReissueBody = z.strictObject({
  projectId: idField,
  unitId: idField,
  priceCentavos: positiveMoney,
  scheme: z.enum(["C", "T"]),
  termMonths: z.number().int().min(1).max(36),
  clauses: z.enum(["S", "N"]),
  date: dateOnly,
  reason: z.string().min(1).max(500),
}).superRefine(cashTermMonths);

const IgpCorrectBody = z.strictObject({
  priceCentavos: positiveMoney,
  referrerMemberId: idField.nullable(),
  referralReference: z.string().max(200).optional(),
  reason: z.string().min(1).max(500),
});

export const IgpActionBody = z.discriminatedUnion("type", [
  z.strictObject({ type: z.literal("record"), input: IgpRecordBody }),
  z.strictObject({ type: z.literal("accredit"), memberId: idField, number: z.string().min(1).max(20), approvedDate: dateOnly }),
  z.strictObject({ type: z.literal("threshold"), basisPoints: z.number().int().positive().max(10_000), reason: z.string().min(1).max(500) }),
  z.strictObject({ type: z.literal("grantTierRules"), rules: z.array(z.strictObject({ tier: z.string().min(1).max(10), minPriceCentavos: positiveMoney })).min(1).max(20), reason: z.string().min(1).max(500) }),
  z.strictObject({ type: z.literal("approve"), id: idField }),
  z.strictObject({ type: z.literal("default"), id: idField, reason: z.string().min(1).max(500) }),
  z.strictObject({ type: z.literal("cancel"), id: idField, refundCentavos: money, refundDate: dateOnly.nullable(), reason: z.string().min(1).max(500) }),
  z.strictObject({ type: z.literal("reissue"), id: idField, input: IgpReissueBody }),
  z.strictObject({ type: z.literal("correct"), id: idField, input: IgpCorrectBody }),
  z.strictObject({ type: z.literal("document"), id: idField, key: z.enum(["reservation", "cts", "goodwill_grant", "deed", "formal_grant", "lease", "spa"]), signedDate: dateOnly, signers: z.string().min(1).max(200) }),
]);

export const IgpHistoryImportBody = z.strictObject({
  fileName: z.string().min(1).max(200),
  records: z.array(z.record(z.string(), z.string().max(500))).min(1).max(1_000),
  declaration: z.boolean(),
});

export const IgpProjectBody = z.strictObject({ name: z.string().min(1).max(80), location: z.string().max(80).optional() });
export const IgpProjectPatch = z.strictObject({ name: z.string().min(1).max(80).optional(), location: z.string().max(80).optional(), status: z.enum(["active", "inactive"]).optional() });
export const IgpUnitBody = z.strictObject({ projectId: idField, unitOrLot: z.string().min(1).max(40), propertyOwner: z.string().min(1).max(80) });
export const IgpUnitPatch = z.strictObject({ unitOrLot: z.string().min(1).max(40).optional(), propertyOwner: z.string().min(1).max(80).optional(), status: z.enum(["active", "inactive"]).optional() });

export const AccreditedSellerBody = z.strictObject({
  mode: z.enum(["IST", "OST"]),
  sellerIdentity: z.enum(["new", "existing"]),
  existingAccountId: idField.nullable().optional(),
  firstName: z.string().max(120), middleName: z.string().max(120), noMiddleName: z.boolean(), lastName: z.string().max(120), suffix: z.string().max(20).nullable().optional(),
  mobileNumber: z.string().max(30), dateOfBirth: dateOnly, email: orgEmail,
  tempPassword: z.string().max(200).optional(), confirmPassword: z.string().max(200).optional(),
  profilePhotoName: z.string().max(200).nullable().optional(), profilePhotoUrl: z.string().max(500).nullable().optional(),
  street: z.string().max(200), province: z.string().max(120), city: z.string().max(120), barangay: z.string().max(120), postalCode: z.string().max(20),
  designation, teamName: z.string().max(120).nullable().optional(), parentId: idField.nullable(),
  cardApplicationDate: dateOnly, programCategory: z.string().max(60), vipCardLevel: z.string().max(10),
  gender: z.string().max(30), civilStatus: z.string().max(30), governmentIdType: z.string().max(60), governmentIdNumber: z.string().max(60),
  telephone: z.string().max(30).nullable().optional(), facebook: z.string().max(200).nullable().optional(), tin: z.string().max(30).nullable().optional(),
  businessEmployer: z.string().max(200).nullable().optional(), businessAddress: z.string().max(300).nullable().optional(), jobPosition: z.string().max(120).nullable().optional(),
  approvedStart: dateOnly, accreditationStatus: z.enum(["pending", "accredited", "cancel", "expired"]), aaMethod: z.enum(["automatic", "manual"]), manualAaSuffix: z.string().max(20).optional(),
});

// ---------------------------------------------------------------- F6: commissions
const MONTH = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Use the month format YYYY-MM.");
const AllowanceStretchBody = z.strictObject({
  days: z.number().int().min(0).max(31),
  teamTcpCentavos: money,
  collectionsCentavos: money,
  assumedCreditCentavos: money,
});
const WorkbookTotals = z.strictObject({ baCentavos: money, paCentavos: money, pbCentavos: money });

export const CommissionRateBody = z.strictObject({
  memberId: idField, product: z.enum(["VIP", "IGP"]), role: z.enum(["DSC", "DRI"]),
  rateBp: z.number().int().min(0), standardRateBp: z.number().int().min(0).nullable(),
  reason: z.string().max(500).optional(),
});
export const VipPositionRateBody = z.strictObject({
  designation: z.enum(["SVD", "SSM", "SM", "OST"]), role: z.enum(["DSC", "DRI"]),
  rateBp: z.number().int().min(0), approvalReference: z.string().min(1).max(200),
});
export const ApplyVipPositionRateBody = z.strictObject({
  memberId: idField,
  standard: z.strictObject({
    designation: z.enum(["SVD", "SSM", "SM", "OST"]), role: z.enum(["DSC", "DRI"]),
    rateBp: z.number().int().min(0), approvalReference: z.string().min(1).max(200),
  }),
  serviceTermsReference: z.string().min(1).max(200),
});
export const ClawbackAddendumBody = z.strictObject({ memberId: idField, signedDate: dateOnly.nullable() });
export const PreparePayoutListBody = z.strictObject({ month: MONTH });
export const ClawbackRecoveryBody = z.strictObject({ amountCentavos: z.number().int().min(1), reference: z.string().min(1).max(200) });
export const CommissionAdjustBody = z.strictObject({ percentBp: z.number().int().min(1).max(10_000), reason: z.string().min(1).max(500) });
export const CommissionHoldBody = z.strictObject({ action: z.enum(["keep", "cancel", "restore"]), reason: z.string().min(1).max(500) });
export const CommissionPayoutBody = z.strictObject({
  reference: z.string().min(1).max(200), method: z.string().max(40).nullable().optional(),
  payoutDate: dateOnly, evidenceFileName: z.string().max(200).optional(), evidenceDataUrl: z.string().max(4_000_000).optional(),
});
export const AllowanceReviewBody = z.strictObject({
  month: MONTH, memberId: idField, qualifying: AllowanceStretchBody, extended: AllowanceStretchBody,
  withholdingReason: z.string().max(300).optional(),
  workbook: WorkbookTotals.nullable(), workbookDifferenceReason: z.string().max(500).optional(),
});
export const AssembleQuery = z.object({ month: MONTH });
