import "server-only";
import { getAuth } from "firebase-admin/auth";
import { ApiError } from "@/server/api/errors";
import { dbRead, listAll } from "@/server/db";
import { getAdminApp } from "@/server/firebase-admin";
import type { AccountStatus, DevIdentity, DevRole } from "@/modules/identity/types";

export type Actor = { identity: DevIdentity; userId: string; portal: string; accountStatus: string };

const KNOWN_ROLES = new Set<string>(["super_admin", "admin", "finance", "hr", "clerk", "gsd", "svd", "ssm", "sm", "ost"]);

type UserRow = { id: string; displayName: string; status: string; portal: string; member: { id: string; branchId: string } | null };
type RoleRow = { role: string; status: string };

// shortcut: system roles only. Department-role module grants need the staff and department
// tables, which are outside the pilot schema. Add them with the staff module.
function toIdentity(user: UserRow, roleRows: RoleRow[]): DevIdentity {
  const assignments = roleRows
    .filter((row) => KNOWN_ROLES.has(row.role))
    .map((row) => ({ role: row.role as DevRole, status: row.status === "active" ? ("active" as const) : ("inactive" as const) }));
  const status: AccountStatus = user.status === "active" ? "active" : user.status === "suspended" ? "suspended" : "inactive";
  return {
    id: user.id,
    displayName: user.displayName,
    roles: assignments.map((assignment) => assignment.role),
    roleAssignments: assignments,
    memberId: user.member?.id ?? null,
    branchId: user.member?.branchId ?? null,
    status,
  };
}

/** Loads the account linked to a verified Firebase user, with its current status and roles. Null when none is linked. */
export async function loadActorByUid(uid: string): Promise<Actor | null> {
  const users = await dbRead<{ userAccounts: UserRow[] }>(
    `query($uid: String!) { userAccounts(where: { firebaseUid: { eq: $uid } }, limit: 1) { id displayName status portal member { id branchId } } }`,
    { uid },
  );
  const user = users.userAccounts[0];
  if (!user) return null;
  const roles = await listAll<RoleRow>("roleAssignments", "role status", { where: "{ user: { id: { eq: $id } } }", orderBy: "[{ role: ASC }]", variableDefinitions: "$id: UUID!", variables: { id: user.id } });
  return { identity: toIdentity(user, roles), userId: user.id, portal: user.portal, accountStatus: user.status };
}

/**
 * Turns a session cookie into the current actor. Expired, revoked or forged cookies
 * give null. The account is read fresh on every call, so a role or status change
 * takes effect on the very next request.
 */
export async function resolveActorFromSessionCookie(cookie: string | undefined): Promise<Actor | null> {
  if (!cookie) return null;
  try {
    const decoded = await getAuth(getAdminApp()).verifySessionCookie(cookie, true);
    return await loadActorByUid(decoded.uid);
  } catch (error) {
    if (error instanceof Error && "code" in error && String((error as { code: unknown }).code).startsWith("auth/")) return null;
    throw error;
  }
}

/** For protected endpoints: 401 without a valid session, 403 when the account is not Active. */
export async function requireActor(cookie: string | undefined): Promise<Actor> {
  const actor = await resolveActorFromSessionCookie(cookie);
  if (!actor) throw new ApiError(401, "unauthenticated", "Sign in to continue.");
  if (actor.identity.status !== "active") throw new ApiError(403, "account_not_active", "This account is not active. Contact your administrator.");
  return actor;
}
