import "server-only";
import { ApiError } from "@/server/api/errors";
import { listAll } from "@/server/db";
import type { Actor } from "@/server/auth/actor";
import { getGrantedModuleIds, hasOperationPermission, type AdminModuleId, type AdminOperation } from "@/modules/identity/permissions";
import { getVisibleMemberIds } from "@/modules/identity/record-scope";
import type { OrgMember } from "@/modules/organization/types";

/** 403 unless the actor's active roles grant the operation. Reuses the same grant tables as the screens. */
export function requireOperation(actor: Actor, operation: AdminOperation): void {
  if (!hasOperationPermission(actor.identity, operation)) {
    throw new ApiError(403, "forbidden", "You do not have permission to do this.");
  }
}

/** 403 unless the actor's active roles grant the module that owns the surface. */
export function requireModule(actor: Actor, moduleId: AdminModuleId): void {
  if (!getGrantedModuleIds(actor.identity).has(moduleId)) {
    throw new ApiError(403, "forbidden", "You do not have permission to do this.");
  }
}

type MemberRow = { id: string; displayName: string; designation: string; branchId: string; status: string; parent: { id: string } | null };

// Fields record scope needs. The rest of OrgMember is not read from the database yet.
export async function loadScopeMembers(): Promise<OrgMember[]> {
  const rows = await listAll<MemberRow>("members", "id displayName designation branchId status parent { id }");
  return rows.map((row) => ({
    id: row.id,
    displayName: row.displayName,
    designation: row.designation,
    branchId: row.branchId,
    status: row.status,
    parentId: row.parent?.id ?? null,
  })) as unknown as OrgMember[];
}

/** Members the actor may see: everyone for office roles, the downline for IST, themselves for OST. */
export async function visibleMemberIdsFor(actor: Actor): Promise<Set<string>> {
  return getVisibleMemberIds(actor.identity, { members: await loadScopeMembers() });
}
