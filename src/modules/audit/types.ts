export type AuditModule =
  | "sales-network" | "accreditation" | "organization"
  | "customers" | "vip-products" | "contracts" | "finance" | "sales" | "commissions" | "membership" | "stay-points";

export type AuditEntityType =
  | "member" | "accreditation" | "account" | "staff" | "department-role" | "department"
  | "customer" | "customer-import" | "customer-export" | "product" | "payment-scheme" | "contract" | "sale" | "payment" | "membership" | "commission" | "resort-spend";

/** Minimal append-only mock audit event for Sales Network / Accreditation / Organization actions. */
export type AuditEvent = {
  id: string;
  /** ISO timestamp of the actual event. */
  timestamp: string;
  actorId: string;
  actorRoles: string[];
  module: AuditModule;
  /** Exact operation performed, e.g. ACCREDITATION_STATUS_CHANGED. */
  action: string;
  entityType: AuditEntityType;
  /** Immutable canonical record ID. */
  entityId: string;
  /** Official AA number when issued; never an internal member ID. */
  displayReference?: string | null;
  previousValue?: string | null;
  newValue?: string | null;
  outcome: "success";
  reason?: string | null;
  relatedRecordIds?: string[];
};

/** Successful organization audit actions (S3-C1). Sales Network and
 *  Accreditation actions keep their existing inline strings. */
export const AUDIT_ACTIONS = {
  ACCOUNT_CREATED: "ACCOUNT_CREATED",
  ACCOUNT_DELETED: "ACCOUNT_DELETED",
  ACCOUNT_STATUS_CHANGED: "ACCOUNT_STATUS_CHANGED",
  ACCOUNT_ROLE_ASSIGNED: "ACCOUNT_ROLE_ASSIGNED",
  ACCOUNT_ROLE_REVOKED: "ACCOUNT_ROLE_REVOKED",
  STAFF_CREATED: "STAFF_CREATED",
  STAFF_UPDATED: "STAFF_UPDATED",
  ROLE_CREATED: "ROLE_CREATED",
  ROLE_UPDATED: "ROLE_UPDATED",
  DEPARTMENT_STATUS_CHANGED: "DEPARTMENT_STATUS_CHANGED",
} as const;

export const AUDIT_MODULES = [
  "sales-network", "accreditation", "organization",
  "customers", "vip-products", "contracts", "finance", "sales", "commissions", "membership", "stay-points",
] as const satisfies ReadonlyArray<AuditEvent["module"]>;
export const AUDIT_ENTITY_TYPES = [
  "member", "accreditation", "account", "staff", "department-role", "department",
  "customer", "product", "payment-scheme", "contract", "sale", "payment", "membership", "commission", "resort-spend",
] as const satisfies ReadonlyArray<AuditEvent["entityType"]>;

export const AUDIT_DEFAULT_PAGE_SIZE = 25;
export const AUDIT_MAX_PAGE_SIZE = 100;

/** Filters and paging for the read-only audit history. Every field is optional. */
export type AuditQuery = {
  page?: number;
  pageSize?: number;
  module?: AuditEvent["module"];
  entityType?: AuditEvent["entityType"];
  action?: string;
  actorId?: string;
  entityId?: string;
  /** Matches events whose relatedRecordIds contain this id exactly. */
  relatedRecordId?: string;
  /** Inclusive ISO date or timestamp bounds on the event time. */
  from?: string;
  to?: string;
};

/**
 * Safe projection of an AuditEvent. Values the policy withholds are null
 * (never moved into another field); `reasonRecorded` only says a reason exists.
 */
export type AuditEventView = {
  id: string;
  timestamp: string;
  actorId: string;
  actorRoles: string[];
  module: AuditEvent["module"];
  action: string;
  entityType: AuditEvent["entityType"];
  entityId: string;
  outcome: "success";
  displayReference: string | null;
  previousValue: string | null;
  newValue: string | null;
  reason: string | null;
  reasonRecorded: boolean;
  relatedRecordIds: string[];
};

export type AuditPage = {
  items: AuditEventView[];
  page: number;
  pageSize: number;
  total: number;
};

/** Controlled validation failure for an invalid audit query. */
export class AuditQueryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuditQueryError";
  }
}

/**
 * Audit actions written by the business modules. Payloads carry only statuses,
 * identifiers and amounts: never names, contact details, government IDs, bank
 * details, receipt contents or credentials (doc 12 section 9).
 */
export const BUSINESS_AUDIT_ACTIONS = {
  CUSTOMER_DRAFT_CREATED: "CUSTOMER_DRAFT_CREATED",
  CUSTOMER_DRAFT_UPDATED: "CUSTOMER_DRAFT_UPDATED",
  CUSTOMER_DRAFT_DISCARDED: "CUSTOMER_DRAFT_DISCARDED",
  CUSTOMER_SUBMITTED: "CUSTOMER_SUBMITTED",
  CUSTOMER_CORRECTED: "CUSTOMER_CORRECTED",
  CUSTOMER_IMPORT_COMPLETED: "CUSTOMER_IMPORT_COMPLETED",
  CUSTOMERS_EXPORTED: "CUSTOMERS_EXPORTED",
  PRODUCT_UPDATED: "PRODUCT_UPDATED",
  PRODUCT_RETIRED: "PRODUCT_RETIRED",
  PAYMENT_SCHEME_CREATED: "PAYMENT_SCHEME_CREATED",
  PAYMENT_SCHEME_UPDATED: "PAYMENT_SCHEME_UPDATED",
  CONTRACT_PREPARED: "CONTRACT_PREPARED",
  CONTRACT_SUBMITTED: "CONTRACT_SUBMITTED",
  CONTRACT_REVIEW_STARTED: "CONTRACT_REVIEW_STARTED",
  CONTRACT_RETURNED: "CONTRACT_RETURNED",
  CONTRACT_FINALIZED: "CONTRACT_FINALIZED",
  CONTRACT_CANCELLED: "CONTRACT_CANCELLED",
  CONTRACT_CANCELLATION_REQUESTED: "CONTRACT_CANCELLATION_REQUESTED",
  CONTRACT_CANCELLATION_DECLINED: "CONTRACT_CANCELLATION_DECLINED",
  CONTRACT_RA_RECORDED: "CONTRACT_RA_RECORDED",
  CONTRACT_ARRANGEMENT_APPROVED: "CONTRACT_ARRANGEMENT_APPROVED",
  SALE_RECORDED: "SALE_RECORDED",
  SALE_CONFIRMED: "SALE_CONFIRMED",
  SALE_REVERSED: "SALE_REVERSED",
  SALE_RECONFIRMED: "SALE_RECONFIRMED",
  SALE_CANCELLED: "SALE_CANCELLED",
  PAYMENTS_FORFEITED: "PAYMENTS_FORFEITED",
  MEMBERSHIP_CANCELLED: "MEMBERSHIP_CANCELLED",
  PAYMENT_SUBMITTED: "PAYMENT_SUBMITTED",
  PAYMENT_REVIEW_STARTED: "PAYMENT_REVIEW_STARTED",
  PAYMENT_VERIFIED: "PAYMENT_VERIFIED",
  PAYMENT_REJECTED: "PAYMENT_REJECTED",
  PAYMENT_RETURNED: "PAYMENT_RETURNED",
  PAYMENT_RESUBMITTED: "PAYMENT_RESUBMITTED",
  PAYMENT_REVERSED: "PAYMENT_REVERSED",
  PAYMENT_REFUNDED: "PAYMENT_REFUNDED",
  FINANCIAL_HOLD_APPLIED: "FINANCIAL_HOLD_APPLIED",
  FINANCIAL_HOLD_RELEASED: "FINANCIAL_HOLD_RELEASED",
  MEMBERSHIP_CREATED: "MEMBERSHIP_CREATED",
  MEMBERSHIP_ACTIVATED: "MEMBERSHIP_ACTIVATED",
  CARD_ID_ISSUED: "CARD_ID_ISSUED",
  COMMISSION_APPROVED: "COMMISSION_APPROVED",
  COMMISSION_ADJUSTED: "COMMISSION_ADJUSTED",
  COMMISSION_HELD: "COMMISSION_HELD",
  COMMISSION_HOLD_RESOLVED: "COMMISSION_HOLD_RESOLVED",
  COMMISSION_CANCELLED: "COMMISSION_CANCELLED",
  COMMISSION_PAYOUT_RECORDED: "COMMISSION_PAYOUT_RECORDED",
  COMMISSION_PAID: "COMMISSION_PAID",
  POINTS_HOLD_RECONCILED: "POINTS_HOLD_RECONCILED",
} as const;

/** Actor id used for automated actions (overdue, holds). */
export const SYSTEM_ACTOR_ID = "system";
