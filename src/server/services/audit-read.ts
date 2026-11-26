import "server-only";
import { ApiError } from "@/server/api/errors";
import type { Actor } from "@/server/auth/actor";
import { requireOperation } from "@/server/auth/authorize";
import { dbRead, listAll } from "@/server/db";
import {
  AUDIT_DEFAULT_PAGE_SIZE,
  AUDIT_MAX_PAGE_SIZE,
  AUDIT_MODULE_BY_ENTITY,
  SYSTEM_ACTOR_ID,
  type AuditActorOption,
  type AuditEvent,
  type AuditEventView,
  type AuditPage,
  type AuditQuery,
} from "@/modules/audit/types";
import { humanize } from "@/shared/lib/humanize";
import { recordLabel } from "@/shared/lib/record-label";
import { auditModuleOf } from "@/server/services/common";

type Json = Record<string, unknown>;
type AuditRow = {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  module: string | null;
  occurredAt: string;
  correlationId: string | null;
  details: Json | null;
  actor: { id: string; displayName: string } | null;
};
type RoleRow = { role: string; status: string; user: { id: string } | null };

const ROW_FIELDS = "id action entityType entityId module occurredAt correlationId details actor { id displayName }";
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/** A date-only bound means the whole Asia/Manila business day (UTC+8; no daylight saving). */
const startOfDay = (value: string) => (DATE_ONLY.test(value) ? `${value}T00:00:00.000+08:00` : value);
const endOfDay = (value: string) => (DATE_ONLY.test(value) ? `${value}T23:59:59.999+08:00` : value);

const textOf = (value: unknown): string | null => (typeof value === "string" && value ? value : null);

function moduleOf(row: AuditRow): AuditEvent["module"] {
  return auditModuleOf(row) as AuditEvent["module"];
}

function entityNameOf(row: AuditRow): string | null {
  return textOf(row.details?.displayReference) ?? null;
}

function relatedIdsOf(row: AuditRow): string[] {
  const value = row.details?.relatedRecordIds;
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function viewOf(row: AuditRow, rolesByActor: Map<string, string[]>): AuditEventView {
  const name = entityNameOf(row);
  const actorId = row.actor?.id ?? SYSTEM_ACTOR_ID;
  return {
    id: row.id,
    timestamp: row.occurredAt,
    actorId,
    actorName: row.actor?.displayName ?? "System",
    // Roles are read as they stand now; the event itself keeps the actor's identity.
    actorRoles: rolesByActor.get(actorId) ?? [],
    module: moduleOf(row),
    action: row.action,
    entityType: row.entityType as AuditEventView["entityType"],
    entityId: row.entityId,
    entityLabel: recordLabel(humanize(row.entityType), name),
    entityName: name,
    entityDetail: null,
    // Every stored row is a committed change: the audit row is written in the same transaction as the
    // action, so a failed action leaves no row (doc 12 section 22.2). No other outcome is stored.
    outcome: "success",
    displayReference: name,
    previousValue: textOf(row.details?.previousValue),
    newValue: textOf(row.details?.newValue),
    reason: textOf(row.details?.reason),
    reasonRecorded: Boolean(row.details?.reason),
    relatedRecordIds: relatedIdsOf(row),
  };
}

type ValidatedQuery = {
  page: number;
  pageSize: number;
  module?: string;
  entityType?: string;
  action?: string;
  actorId?: string;
  entityId?: string;
  from?: string;
  to?: string;
};

/** Validates paging and filter values; an invalid audit query is a controlled 422, never a 500. */
function validateQuery(query: AuditQuery): ValidatedQuery {
  const page = query.page ?? 1;
  const pageSize = query.pageSize ?? AUDIT_DEFAULT_PAGE_SIZE;
  if (!Number.isInteger(page) || page < 1) throw new ApiError(422, "invalid_audit_query", "page must be a whole number of 1 or more.");
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > AUDIT_MAX_PAGE_SIZE) throw new ApiError(422, "invalid_audit_query", `pageSize must be a whole number between 1 and ${AUDIT_MAX_PAGE_SIZE}.`);
  if (query.from !== undefined && Number.isNaN(Date.parse(query.from))) throw new ApiError(422, "invalid_audit_query", "from must be a valid date or timestamp.");
  if (query.to !== undefined && Number.isNaN(Date.parse(query.to))) throw new ApiError(422, "invalid_audit_query", "to must be a valid date or timestamp.");
  if (query.from !== undefined && query.to !== undefined && Date.parse(query.from) > Date.parse(query.to)) {
    throw new ApiError(422, "invalid_audit_query", "from must not be later than to.");
  }
  return {
    page, pageSize,
    module: query.module, entityType: query.entityType, action: query.action,
    actorId: query.actorId, entityId: query.entityId, from: query.from, to: query.to,
  };
}

function filterOf(query: ValidatedQuery): { where: string; variableDefinitions: string; variables: Record<string, unknown> } {
  const clauses: string[] = [];
  const definitions: string[] = [];
  const variables: Record<string, unknown> = {};
  if (query.module) {
    // The stored module, plus pre-F8 rows that predate the column: the view shows those under their
    // record type's module, so the filter matches the same rows (filter and display agree).
    const legacyTypes = Object.entries(AUDIT_MODULE_BY_ENTITY).filter(([, moduleId]) => moduleId === query.module).map(([type]) => type);
    definitions.push("$module: String!", "$moduleEntities: [String!]!");
    variables.module = query.module;
    variables.moduleEntities = legacyTypes;
    clauses.push(`{ _or: [ { module: { eq: $module } }, { _and: [ { module: { isNull: true } }, { entityType: { in: $moduleEntities } } ] } ] }`);
  }
  if (query.entityType) { definitions.push("$entityType: String!"); variables.entityType = query.entityType; clauses.push("{ entityType: { eq: $entityType } }"); }
  if (query.action) { definitions.push("$action: String!"); variables.action = query.action; clauses.push("{ action: { eq: $action } }"); }
  if (query.actorId) { definitions.push("$actor: UUID!"); variables.actor = query.actorId; clauses.push("{ actor: { id: { eq: $actor } } }"); }
  if (query.entityId) { definitions.push("$entityId: String!"); variables.entityId = query.entityId; clauses.push("{ entityId: { eq: $entityId } }"); }
  if (query.from) { definitions.push("$from: Timestamp!"); variables.from = startOfDay(query.from); clauses.push("{ occurredAt: { ge: $from } }"); }
  if (query.to) { definitions.push("$to: Timestamp!"); variables.to = endOfDay(query.to); clauses.push("{ occurredAt: { le: $to } }"); }
  return {
    where: clauses.length > 0 ? `{ _and: [${clauses.join(", ")}] }` : "",
    variableDefinitions: definitions.join(", "),
    variables,
  };
}

async function rolesByActor(actorIds: readonly string[]): Promise<Map<string, string[]>> {
  if (actorIds.length === 0) return new Map();
  const wanted = new Set(actorIds);
  const rows = await listAll<RoleRow>("roleAssignments", "role status user { id }", { orderBy: "[{ role: ASC }]" });
  const grouped = new Map<string, string[]>();
  for (const row of rows) {
    const id = row.user?.id;
    if (!id || !wanted.has(id) || row.status !== "active") continue;
    grouped.set(id, [...(grouped.get(id) ?? []), row.role]);
  }
  return grouped;
}

/**
 * Read-only, privacy-projected audit history (doc 12 section 19). Filters and paging are applied in
 * the database; the total is counted over the same filter. Audit rows are never changed or deleted.
 */
export async function listAuditEvents(actor: Actor, query: AuditQuery = {}): Promise<AuditPage> {
  requireOperation(actor, "audit.read");
  const validated = validateQuery(query);
  const filter = filterOf(validated);
  // The total is a second read over the same filter; audit volume is small and the page reads are capped.
  const matching = await listAll<{ id: string }>("auditEvents", "id", filter);
  const definitions = ["$limit: Int!", "$offset: Int!", filter.variableDefinitions].filter(Boolean).join(", ");
  const args = [filter.where ? `where: ${filter.where}` : "", "orderBy: [{ occurredAt: DESC }, { id: DESC }]", "limit: $limit", "offset: $offset"].filter(Boolean).join(", ");
  const page = await dbRead<{ auditEvents: AuditRow[] }>(
    `query(${definitions}) { auditEvents(${args}) { ${ROW_FIELDS} } }`,
    { ...filter.variables, limit: validated.pageSize, offset: (validated.page - 1) * validated.pageSize },
  );
  const roles = await rolesByActor(page.auditEvents.map((row) => row.actor?.id).filter((id): id is string => Boolean(id)));
  return {
    items: page.auditEvents.map((row) => viewOf(row, roles)),
    page: validated.page,
    pageSize: validated.pageSize,
    total: matching.length,
  };
}

/** Everyone who appears as an actor in the history, sorted by name, for the actor filter. */
export async function listAuditActors(actor: Actor): Promise<AuditActorOption[]> {
  requireOperation(actor, "audit.read");
  const rows = await listAll<{ actor: { id: string; displayName: string } | null }>("auditEvents", "actor { id displayName }");
  const seen = new Map<string, string>();
  for (const row of rows) {
    if (row.actor) seen.set(row.actor.id, row.actor.displayName);
  }
  return [...seen.entries()]
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label));
}
