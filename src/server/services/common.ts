import "server-only";
import { randomUUID } from "node:crypto";
import { AUDIT_MODULE_BY_ENTITY } from "@/modules/audit/types";
import type { Actor } from "@/server/auth/actor";
import { ApiError } from "@/server/api/errors";
import { dbWrite, failedCheck, uniqueViolation } from "@/server/db";
import { manilaToday } from "@/shared/lib/dates";

export const nowIso = () => new Date().toISOString();
export const today = () => manilaToday();
/** A fresh internal id in the database's own format (32 hex digits, no hyphens). */
export const newId = () => randomUUID().replaceAll("-", "");

export type AuditSpec = { action: string; entityType: string; entityId: string; details?: Record<string, unknown> };

/** The module an audit event belongs to: the stored column, then its payload's value, then the record type's module. */
export function auditModuleOf(input: { module?: string | null; entityType: string; details?: Record<string, unknown> | null }): string {
  const declared = input.module ?? input.details?.module;
  return typeof declared === "string" && declared ? declared : AUDIT_MODULE_BY_ENTITY[input.entityType] ?? "organization";
}

/** Audit row for one change. Never put credentials, tokens or unnecessary personal data in `details`. */
export function auditData(actor: Actor | null, spec: AuditSpec, correlationId?: string) {
  return { actorId: actor?.userId ?? undefined, action: spec.action, entityType: spec.entityType, entityId: spec.entityId, module: auditModuleOf(spec), correlationId, details: spec.details ?? {} };
}

/**
 * Runs the given mutation fields and the audit entry as ONE database transaction: either everything
 * commits or nothing does. Guards inside `fields` (see the `@check` blocks) abort and roll everything
 * back; `markers` turns each guard's message into the API error to return.
 */
export async function transact(
  actor: Actor | null,
  input: { variableDefinitions: string; fields: string; variables: Record<string, unknown>; audit: AuditSpec[]; markers?: Record<string, ApiError> },
): Promise<void> {
  const audits = input.audit.map((spec, index) => ({ alias: `audit${index}`, variable: `$audit${index}`, data: auditData(actor, spec) }));
  const variableDefinitions = [input.variableDefinitions, ...audits.map((item) => `${item.variable}: AuditEvent_Data!`)].filter(Boolean).join(", ");
  const auditFields = audits.map((item) => `${item.alias}: auditEvent_insert(data: ${item.variable})`).join("\n");
  const variables = { ...input.variables, ...Object.fromEntries(audits.map((item) => [item.variable.slice(1), item.data])) };
  try {
    await dbWrite(`mutation(${variableDefinitions}) @transaction {\n${input.fields}\n${auditFields}\n}`, variables);
  } catch (error) {
    for (const [marker, apiError] of Object.entries(input.markers ?? {})) if (failedCheck(error, marker)) throw apiError;
    throw error;
  }
}

/** Converts a unique-constraint failure on a named index into an API error; rethrows anything else. */
export function onUnique(error: unknown, indexName: string, apiError: ApiError): never {
  if (uniqueViolation(error) === indexName) throw apiError;
  throw error;
}

export const notFound = (what: string) => new ApiError(404, "not_found", `${what} not found.`);
export const conflict = (code: string, message: string) => new ApiError(409, code, message);
export const invalid = (message: string, fields?: Record<string, string>) => new ApiError(422, "validation_failed", message, fields);
