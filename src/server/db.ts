import "server-only";
import { getDataConnect } from "firebase-admin/data-connect";
import { getAdminApp } from "@/server/firebase-admin";

// Must match dataconnect/dataconnect.yaml.
const CONNECTOR_CONFIG = { location: "asia-southeast1", serviceId: "afhomes" };

type Variables = Record<string, unknown>;

// shortcut: raw GraphQL through the Admin SDK instead of generated connector bindings.
// Move to generated bindings when Step C adds the pilot operations.
function service() {
  return getDataConnect(CONNECTOR_CONFIG, getAdminApp());
}

export async function dbRead<T>(query: string, variables?: Variables): Promise<T> {
  const result = await service().executeGraphqlRead<T, Variables>(query, variables ? { variables } : undefined);
  return result.data;
}

/** SQL Connect reports a duplicate as "violates SQL unique constraint: <index name>". */
export function uniqueViolation(error: unknown): string | null {
  const match = error instanceof Error ? /violates SQL unique constraint: (\S+)/.exec(error.message) : null;
  return match ? match[1] : null;
}

/** A failed `@check` returns its own message followed by "(aborted)". Use a distinctive marker. */
export function failedCheck(error: unknown, marker: string): boolean {
  return error instanceof Error && error.message.includes(marker);
}

export async function dbWrite<T>(query: string, variables?: Variables): Promise<T> {
  const result = await service().executeGraphql<T, Variables>(query, variables ? { variables } : undefined);
  return result.data;
}

const PAGE_SIZE = 100;

/**
 * Reads EVERY row of a list. SQL Connect returns at most 100 rows when a query names no limit, and the rest
 * are dropped silently, so any list that must be complete (totals, scope, duplicate checks) goes through here.
 * Rows are fetched in pages in a stable order.
 */
export async function listAll<T>(
  field: string,
  selection: string,
  options: { where?: string; orderBy?: string; variableDefinitions?: string; variables?: Record<string, unknown> } = {},
): Promise<T[]> {
  const rows: T[] = [];
  const args = [options.where ? `where: ${options.where}` : "", `orderBy: ${options.orderBy ?? "[{ id: ASC }]"}`, "limit: $limit", "offset: $offset"].filter(Boolean).join(", ");
  const definitions = ["$limit: Int!", "$offset: Int!", options.variableDefinitions].filter(Boolean).join(", ");
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const page = await dbRead<Record<string, T[]>>(`query(${definitions}) { ${field}(${args}) { ${selection} } }`, { ...options.variables, limit: PAGE_SIZE, offset });
    rows.push(...page[field]);
    if (page[field].length < PAGE_SIZE) return rows;
  }
}
