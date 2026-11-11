import type { MockAsyncOptions } from "@/data/contracts/async-options";
import { simulateAsync } from "@/data/contracts/async-options";
import type { AuditRepository } from "@/data/contracts/audit-repository";
import {
  AUDIT_DEFAULT_PAGE_SIZE,
  AUDIT_ENTITY_TYPES,
  AUDIT_MAX_PAGE_SIZE,
  AUDIT_MODULES,
  AuditQueryError,
  BUSINESS_AUDIT_ACTIONS,
  SYSTEM_ACTOR_ID,
  type AuditEvent,
  type AuditEventView,
  type AuditPage,
  type AuditQuery,
} from "@/modules/audit/types";
import type { DevIdentity } from "@/modules/identity/types";
import { customerRecordName } from "@/modules/customers/rules";
import { formatPeso } from "@/shared/lib/money";
import { humanize } from "@/shared/lib/humanize";
import { recordLabel } from "@/shared/lib/record-label";
import { hasActiveSystemRole } from "./authorization";
import { DEV_IDENTITIES } from "./dev-identities";
import type { MockStore } from "./seed";

export const AUDIT_READ_RESTRICTION = "Audit history is restricted to Administrators.";

const QUERY_KEYS: ReadonlySet<string> = new Set([
  "page", "pageSize", "module", "entityType", "action", "actorId", "entityId", "relatedRecordId", "from", "to",
]);
const MAX_FILTER_LENGTH = 120;
const REDACTED = "[changed]";

// Explicit per-action disclosure policy (deny by default): an action absent
// from a set exposes nothing for that field. Based on the audit payloads the
// repositories actually write; extend only after an owner-approved review.

/** Actions whose previousValue/newValue are enumerations, statuses, ids, or role/module configuration. */
const VALUE_ACTIONS: ReadonlySet<string> = new Set([
  "ACCOUNT_CREATED", "ACCOUNT_STATUS_CHANGED", "ACCOUNT_ROLE_ASSIGNED", "ACCOUNT_ROLE_REVOKED",
  "DEPARTMENT_STATUS_CHANGED", "STAFF_CREATED", "ROLE_CREATED", "ROLE_UPDATED",
  "ACCREDITATION_ISSUED", "ACCREDITATION_STATUS_CHANGED", "ACCREDITATION_CANCELLED",
  "MEMBER_CREATED", "MEMBER_STATUS_CHANGED", "MEMBER_TRANSFERRED", "SELLER_CREATED",
  ...Object.values(BUSINESS_AUDIT_ACTIONS),
]);
/** STAFF_UPDATED carries "field:value" pairs; only these fields expose their values. */
const STAFF_UPDATED_VALUE_FIELDS: ReadonlySet<string> = new Set(["department", "role", "account"]);
/** Actions carrying an official AA number in displayReference. */
const REFERENCE_ACTIONS: ReadonlySet<string> = new Set([
  "ACCREDITATION_ISSUED", "ACCREDITATION_STATUS_CHANGED", "ACCREDITATION_CANCELLED", "MEMBER_CREATED", "SELLER_CREATED",
]);
/** Actions whose reason is system-generated text; other reasons are user-entered and withheld. */
const REASON_ACTIONS: ReadonlySet<string> = new Set(["ACCREDITATION_ISSUED", "SELLER_CREATED"]);

function projectStaffUpdated(value: string | null | undefined): string | null {
  if (!value) return null;
  return value
    .split(";")
    .map((pair) => {
      const separator = pair.indexOf(":");
      const field = separator === -1 ? pair : pair.slice(0, separator);
      return STAFF_UPDATED_VALUE_FIELDS.has(field) ? pair : `${field}:${REDACTED}`;
    })
    .join(";");
}

function projectValue(action: string, value: string | null | undefined): string | null {
  if (action === "STAFF_UPDATED") return projectStaffUpdated(value);
  if (action === "MEMBER_UPDATED") return value ? REDACTED : null;
  return VALUE_ACTIONS.has(action) ? (value ?? null) : null;
}

function actorNameOf(store: MockStore, actorId: string): string {
  if (actorId === SYSTEM_ACTOR_ID) return "System";
  const dev = DEV_IDENTITIES.find((identity) => identity.id === actorId);
  if (dev) return dev.displayName;
  const named =
    store.staff.find((item) => item.id === actorId) ??
    store.members.find((item) => item.id === actorId) ??
    store.accounts.find((item) => item.id === actorId);
  return named?.displayName || "Unknown user";
}

function entityLabelOf(store: MockStore, type: AuditEvent["entityType"], id: string): string {
  const customerName = (customerId: string | undefined) => {
    const customer = store.customers.find((item) => item.id === customerId);
    return customer ? customerRecordName(customer) : null;
  };
  switch (type) {
    case "customer":
      return customerName(id) ?? humanize(type);
    case "contract": {
      const contract = store.contracts.find((item) => item.id === id);
      return contract ? recordLabel("Contract", customerName(contract.customerId), contract.productCode) : humanize(type);
    }
    case "sale": {
      const sale = store.sales.find((item) => item.id === id);
      return sale ? recordLabel("Sale", customerName(sale.customerId)) : humanize(type);
    }
    case "payment": {
      const payment = store.payments.find((item) => item.id === id);
      return payment ? recordLabel("Payment", customerName(payment.customerId), formatPeso(payment.amountCentavos)) : humanize(type);
    }
    case "commission": {
      const commission = store.commissions.find((item) => item.id === id);
      return commission ? recordLabel("Commission", commission.recipientName) : humanize(type);
    }
    case "membership": {
      const membership = store.memberships.find((item) => item.id === id);
      return membership ? recordLabel("Membership", customerName(membership.customerId)) : humanize(type);
    }
    case "member":
      return store.members.find((item) => item.id === id)?.displayName || humanize(type);
    case "accreditation": {
      const record = store.accreditations.find((item) => item.id === id);
      return store.members.find((item) => item.id === record?.memberId)?.displayName || humanize(type);
    }
    case "staff":
      return store.staff.find((item) => item.id === id)?.displayName || humanize(type);
    case "account":
      return store.accounts.find((item) => item.id === id)?.displayName || humanize(type);
    case "department":
      return store.departments.find((item) => item.id === id)?.name || humanize(type);
    case "department-role":
      return store.roles.find((item) => item.id === id)?.name || humanize(type);
    default:
      return humanize(type);
  }
}

/** Builds the view field by field from the allowlist; nothing else is copied. */
export function projectAuditEvent(event: AuditEvent, store: MockStore): AuditEventView {
  return {
    id: event.id,
    timestamp: event.timestamp,
    actorId: event.actorId,
    actorName: actorNameOf(store, event.actorId),
    actorRoles: [...event.actorRoles],
    module: event.module,
    action: event.action,
    entityType: event.entityType,
    entityId: event.entityId,
    entityLabel: entityLabelOf(store, event.entityType, event.entityId),
    outcome: event.outcome,
    displayReference: REFERENCE_ACTIONS.has(event.action) ? (event.displayReference ?? null) : null,
    previousValue: projectValue(event.action, event.previousValue),
    newValue: projectValue(event.action, event.newValue),
    reason: REASON_ACTIONS.has(event.action) ? (event.reason ?? null) : null,
    reasonRecorded: Boolean(event.reason),
    relatedRecordIds: [...(event.relatedRecordIds ?? [])],
  };
}

function requireInteger(name: string, value: unknown, min: number, max: number): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < min || value > max) {
    throw new AuditQueryError(`${name} must be an integer between ${min} and ${max}.`);
  }
  return value;
}

function requireText(name: string, value: unknown): string {
  if (typeof value !== "string" || value.trim() === "" || value.length > MAX_FILTER_LENGTH) {
    throw new AuditQueryError(`${name} must be non-empty text of at most ${MAX_FILTER_LENGTH} characters.`);
  }
  return value;
}

function requireTimestamp(name: string, value: unknown): number {
  const time = typeof value === "string" ? Date.parse(value) : Number.NaN;
  if (!Number.isFinite(time)) throw new AuditQueryError(`${name} must be a valid ISO date or timestamp.`);
  return time;
}

type ValidatedQuery = {
  page: number;
  pageSize: number;
  module?: AuditEvent["module"];
  entityType?: AuditEvent["entityType"];
  action?: string;
  actorId?: string;
  entityId?: string;
  relatedRecordId?: string;
  from?: number;
  to?: number;
};

function validateQuery(query: AuditQuery | undefined): ValidatedQuery {
  const raw = (query ?? {}) as Record<string, unknown>;
  for (const key of Object.keys(raw)) {
    if (!QUERY_KEYS.has(key)) throw new AuditQueryError(`Unknown audit query field "${key}".`);
  }
  const valid: ValidatedQuery = {
    page: raw.page === undefined ? 1 : requireInteger("page", raw.page, 1, Number.MAX_SAFE_INTEGER),
    pageSize:
      raw.pageSize === undefined ? AUDIT_DEFAULT_PAGE_SIZE : requireInteger("pageSize", raw.pageSize, 1, AUDIT_MAX_PAGE_SIZE),
  };
  if (raw.module !== undefined) {
    if (!(AUDIT_MODULES as readonly unknown[]).includes(raw.module)) throw new AuditQueryError("module is not a recognized audit module.");
    valid.module = raw.module as AuditEvent["module"];
  }
  if (raw.entityType !== undefined) {
    if (!(AUDIT_ENTITY_TYPES as readonly unknown[]).includes(raw.entityType)) throw new AuditQueryError("entityType is not a recognized entity type.");
    valid.entityType = raw.entityType as AuditEvent["entityType"];
  }
  for (const key of ["action", "actorId", "entityId", "relatedRecordId"] as const) {
    if (raw[key] !== undefined) valid[key] = requireText(key, raw[key]);
  }
  if (raw.from !== undefined) valid.from = requireTimestamp("from", raw.from);
  if (raw.to !== undefined) valid.to = requireTimestamp("to", raw.to);
  if (valid.from !== undefined && valid.to !== undefined && valid.from > valid.to) {
    throw new AuditQueryError("from must not be later than to.");
  }
  return valid;
}

function sequenceOf(event: AuditEvent): number {
  const parsed = Number.parseInt(event.id.slice(event.id.lastIndexOf("-") + 1), 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Single eligibility rule: an active Admin or Super Admin with an eligible linked account. */
export function canReadAuditHistory(store: Pick<MockStore, "accounts" | "staff">, identity: DevIdentity): boolean {
  return hasActiveSystemRole(store, identity, "super_admin") || hasActiveSystemRole(store, identity, "admin");
}

export class MockAuditRepository implements AuditRepository {
  constructor(
    private readonly store: MockStore,
    private readonly getIdentity: () => DevIdentity,
    private readonly asyncOptions?: MockAsyncOptions,
  ) {}

  async list(query?: AuditQuery, options?: MockAsyncOptions): Promise<AuditPage> {
    await simulateAsync({ ...this.asyncOptions, ...options });
    const identity = this.getIdentity();
    // Authorize before validating or reading anything.
    if (!canReadAuditHistory(this.store, identity)) throw new Error(AUDIT_READ_RESTRICTION);

    const q = validateQuery(query);
    const matches = this.store.auditEvents.filter((event) => {
      if (q.module && event.module !== q.module) return false;
      if (q.entityType && event.entityType !== q.entityType) return false;
      if (q.action && event.action !== q.action) return false;
      if (q.actorId && event.actorId !== q.actorId) return false;
      if (q.entityId && event.entityId !== q.entityId) return false;
      if (q.relatedRecordId && !(event.relatedRecordIds ?? []).includes(q.relatedRecordId)) return false;
      const time = Date.parse(event.timestamp);
      if (q.from !== undefined && time < q.from) return false;
      if (q.to !== undefined && time > q.to) return false;
      return true;
    });
    // Newest first; the audit sequence breaks ties between identical timestamps.
    matches.sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp) || sequenceOf(b) - sequenceOf(a));
    const start = (q.page - 1) * q.pageSize;
    return {
      items: matches.slice(start, start + q.pageSize).map((event) => projectAuditEvent(event, this.store)),
      page: q.page,
      pageSize: q.pageSize,
      total: matches.length,
    };
  }
}
