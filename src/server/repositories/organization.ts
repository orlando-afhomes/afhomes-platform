import "server-only";
import { dbRead, listAll } from "@/server/db";
import { manilaDateOf } from "@/shared/lib/dates";
import type { Account } from "@/modules/accounts/types";
import type { DevRole } from "@/modules/identity/types";
import type { Department, DepartmentRole, StaffMember } from "@/modules/organization/types";

type Json = Record<string, unknown>;

// ---------------------------------------------------------------- departments
export type DepartmentRow = { id: string; name: string; code: string; description: string; headStaffId: string | null; status: string };
export const DEPARTMENT_FIELDS = "id name code description headStaffId status";

export function toDepartment(row: DepartmentRow): Department {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    description: row.description,
    headStaffId: row.headStaffId,
    status: row.status === "deactivated" ? "deactivated" : "active",
  };
}

export async function loadDepartments(): Promise<Department[]> {
  return (await listAll<DepartmentRow>("departments", DEPARTMENT_FIELDS)).map(toDepartment);
}

export async function loadDepartment(id: string): Promise<Department | null> {
  const result = await dbRead<{ department: DepartmentRow | null }>(`query($id: UUID!) { department(id: $id) { ${DEPARTMENT_FIELDS} } }`, { id });
  return result.department ? toDepartment(result.department) : null;
}

// ------------------------------------------------------------ department roles
export type DepartmentRoleRow = { id: string; name: string; moduleIds: string[] | null; status: string; isProtected: boolean; createdAt: string; department: { id: string } | null };
export const ROLE_FIELDS = "id name moduleIds status isProtected createdAt department { id }";

export function toDepartmentRole(row: DepartmentRoleRow): DepartmentRole {
  return {
    id: row.id,
    name: row.name,
    departmentId: row.department?.id ?? "",
    moduleIds: row.moduleIds ?? [],
    status: row.status === "deactivated" ? "deactivated" : "active",
    createdAt: manilaDateOf(row.createdAt),
    isProtected: row.isProtected,
  };
}

export async function loadDepartmentRoles(): Promise<DepartmentRole[]> {
  return (await listAll<DepartmentRoleRow>("departmentRoles", ROLE_FIELDS)).map(toDepartmentRole);
}

export async function loadDepartmentRole(id: string): Promise<DepartmentRole | null> {
  const result = await dbRead<{ departmentRole: DepartmentRoleRow | null }>(`query($id: UUID!) { departmentRole(id: $id) { ${ROLE_FIELDS} } }`, { id });
  return result.departmentRole ? toDepartmentRole(result.departmentRole) : null;
}

// ---------------------------------------------------------------- staff
export type StaffRow = {
  id: string; displayName: string; position: string; status: string; email: string; createdAt: string;
  profile: Json | null; department: { id: string } | null; departmentRole: { id: string } | null;
  userAccounts_on_staff: Array<{ id: string }>;
};
export const STAFF_FIELDS = "id displayName position status email createdAt profile department { id } departmentRole { id } userAccounts_on_staff { id }";

export function toStaff(row: StaffRow): StaffMember {
  return {
    id: row.id,
    displayName: row.displayName,
    position: row.position,
    departmentId: row.department?.id ?? null,
    departmentRoleId: row.departmentRole?.id ?? null,
    status: row.status as StaffMember["status"],
    email: row.email,
    createdAt: manilaDateOf(row.createdAt),
    accountId: row.userAccounts_on_staff[0]?.id ?? null,
    ...(row.profile ?? {}),
    avatarUrl: (row.profile as { avatarUrl?: string | null } | null)?.avatarUrl ?? null,
  } as StaffMember;
}

export async function loadStaff(): Promise<StaffMember[]> {
  return (await listAll<StaffRow>("staffMembers", STAFF_FIELDS)).map(toStaff);
}

export async function loadStaffMember(id: string): Promise<StaffMember | null> {
  const result = await dbRead<{ staffMember: StaffRow | null }>(`query($id: UUID!) { staffMember(id: $id) { ${STAFF_FIELDS} } }`, { id });
  return result.staffMember ? toStaff(result.staffMember) : null;
}

/** Staff record linked to a signed-in account (a user account points at its staff record). */
export async function loadStaffForAccount(accountId: string): Promise<StaffMember | null> {
  const result = await dbRead<{ staffMembers: StaffRow[] }>(
    `query($uid: UUID!) { staffMembers(where: { userAccounts_on_staff: { some: { id: { eq: $uid } } } }, limit: 1) { ${STAFF_FIELDS} } }`,
    { uid: accountId },
  );
  const row = result.staffMembers[0];
  return row ? toStaff(row) : null;
}

// ---------------------------------------------------------------- accounts
export type AccountRow = {
  id: string; email: string; displayName: string; status: string; portal: string; createdAt: string;
  createdBy: { id: string } | null; staff: { id: string; department: { id: string } | null } | null;
  roleAssignments_on_user: Array<{ role: string; status: string }>;
};
export const ACCOUNT_FIELDS = "id email displayName status portal createdAt createdBy { id } staff { id department { id } } roleAssignments_on_user { role status }";

const KNOWN_ROLES = new Set<string>(["super_admin", "admin", "finance", "hr", "clerk", "gsd", "svd", "ssm", "sm", "ost"]);

export function toAccount(row: AccountRow): Account {
  const roleIds = row.roleAssignments_on_user
    .filter((assignment) => assignment.status === "active" && KNOWN_ROLES.has(assignment.role))
    .map((assignment) => assignment.role as DevRole);
  return {
    id: row.id,
    displayName: row.displayName,
    email: row.email,
    roleIds,
    status: row.status as Account["status"],
    departmentId: row.staff?.department?.id ?? null,
    createdAt: manilaDateOf(row.createdAt),
    createdBy: row.createdBy?.id,
  };
}

export async function loadAccounts(): Promise<Account[]> {
  return (await listAll<AccountRow>("userAccounts", ACCOUNT_FIELDS)).map(toAccount);
}

export async function loadAccount(id: string): Promise<Account | null> {
  const result = await dbRead<{ userAccount: AccountRow | null }>(`query($id: UUID!) { userAccount(id: $id) { ${ACCOUNT_FIELDS} } }`, { id });
  return result.userAccount ? toAccount(result.userAccount) : null;
}

// ---------------------------------------------------------------- shared
/** Active Super Administrator accounts (status active and an active super_admin assignment). */
export function isActiveSuperAdmin(account: Pick<Account, "status" | "roleIds">): boolean {
  return account.status === "active" && account.roleIds.includes("super_admin");
}

/** Sign-in page an account uses, derived from its system roles the same way the seed does. */
export function portalForRoles(roles: readonly string[]): "admin" | "staff" | "sales" {
  if (roles.includes("super_admin") || roles.includes("admin")) return "admin";
  if (roles.some((role) => ["svd", "ssm", "sm", "ost"].includes(role))) return "sales";
  return "staff";
}
