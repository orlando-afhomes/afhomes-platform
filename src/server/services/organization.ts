import "server-only";
import { getAuth } from "firebase-admin/auth";
import { ApiError } from "@/server/api/errors";
import { AUDIT_ACTIONS } from "@/modules/audit/types";
import { ACCOUNT_STATUS_TRANSITIONS, ACCOUNT_DELETE_DISABLED, type Account, type AccountActionPolicy, type AccountPolicies, type AccountStatus, type LinkedAccountSummary } from "@/modules/accounts/types";
import { getGrantedModuleIds, SYSTEM_ROLES } from "@/modules/identity/permissions";
import type { DevRole } from "@/modules/identity/types";
import { STAFF_DELETE_DISABLED, type Department, type DepartmentRole, type DepartmentRoleOption, type StaffActionPolicy, type StaffMember } from "@/modules/organization/types";
import type { StaffProfileInput, StaffSelfProfile } from "@/data/contracts/staff-repository";
import { validateGovIdNumber } from "@/shared/forms/validation/identification";
import type { Actor } from "@/server/auth/actor";
import { requireOperation, requireModule } from "@/server/auth/authorize";
import { getAdminApp } from "@/server/firebase-admin";
import {
  ADMIN_ACTIVATION_ERROR,
  LAST_SUPER_ADMIN_ERROR,
  LINKED_ACCOUNT_ERROR,
  OWN_ACCOUNT_ERROR,
  PROTECTED_ACCOUNT_ERROR,
  PROTECTED_ROLE_ERROR,
  PROTECTED_STAFF_ERROR,
  SELF_MODIFICATION_ERROR,
  assertCanAssignSystemRole,
  assertCanDelegate,
  assertCanManageRoleGrants,
  canAssignSystemRole,
  canManageRoleGrants,
  hasActiveRole,
  isSuperAdmin,
} from "@/server/auth/guards";
import {
  isActiveSuperAdmin,
  loadAccount,
  loadAccounts,
  loadDepartment,
  loadDepartmentRole,
  loadDepartmentRoles,
  loadDepartments,
  loadStaff,
  loadStaffForAccount,
  loadStaffMember,
  portalForRoles,
} from "@/server/repositories/organization";
import { dbRead } from "@/server/db";
import { attachStaffAvatar, deleteStaffAvatar, downloadStaffAvatar, loadStaffProfile, mergeStaffProfile } from "@/server/storage";
import { conflict, invalid, newId, notFound, transact } from "@/server/services/common";

const STAFF_ACCOUNT_STATUSES: readonly AccountStatus[] = ["active", "suspended", "deactivated"];
const PROFILE_FIELDS = [
  "firstName", "prefix", "middleName", "lastName", "suffix", "mobileNumber", "street", "province", "city", "barangay",
  "postalCode", "telephone", "facebook", "tin", "gender", "civilStatus", "governmentIdType", "governmentIdNumber",
] as const;

// ---------------------------------------------------------------- helpers
type OrgModule = "departments" | "roles" | "staff" | "accounts";
const moduleGranted = (actor: Actor, moduleId: OrgModule) => getGrantedModuleIds(actor.identity).has(moduleId);

function codeFor(name: string): string {
  const slug = name
    .toUpperCase()
    .normalize("NFKD")
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 20);
  return slug || "DEPT";
}

function uniqueCode(base: string, taken: readonly string[]): string {
  const used = new Set(taken.map((code) => code.toLowerCase()));
  if (!used.has(base.toLowerCase())) return base;
  for (let suffix = 2; ; suffix += 1) {
    const candidate = `${base.slice(0, 16)}-${suffix}`;
    if (!used.has(candidate.toLowerCase())) return candidate;
  }
}

const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");

/** Profile fields a staff record keeps in the jsonb column. Blank optional values become null. */
function profileData(input: StaffProfileInput): Record<string, string | null> {
  const profile: Record<string, string | null> = {};
  for (const field of PROFILE_FIELDS) {
    const value = input[field];
    if (value === undefined) continue;
    profile[field] = value === null ? null : text(value) || null;
  }
  return profile;
}

/** Rejects an ID number that does not match its selected type before the profile is saved. */
function validateGovernmentIdProfile(profile: Record<string, string | null>): void {
  if (!profile.governmentIdNumber) return;
  const error = validateGovIdNumber(profile.governmentIdNumber, profile.governmentIdType ?? undefined);
  if (error) throw invalid(error, { governmentIdNumber: error });
}

/** Existing profile fields of a staff record, ready to merge with an edit. */
function storedProfile(staff: StaffMember): Record<string, string | null> {
  const profile: Record<string, string | null> = {};
  for (const field of PROFILE_FIELDS) {
    const value = staff[field];
    if (value !== undefined) profile[field] = value;
  }
  return profile;
}

function normalizeStatus(value: string | undefined): "active" | "deactivated" {
  return value === "deactivated" ? "deactivated" : "active";
}

/** Active Super Administrators, for the last-one protection. */
function assertKeepsActiveSuperAdmin(accounts: Account[], accountId: string, next: { roleIds: readonly string[]; status: string }): void {
  const current = accounts.find((account) => account.id === accountId);
  if (!current || !isActiveSuperAdmin(current)) return;
  const nextIsActiveSuperAdmin = next.status === "active" && next.roleIds.includes("super_admin");
  if (nextIsActiveSuperAdmin) return;
  if (!accounts.some((account) => account.id !== accountId && isActiveSuperAdmin(account))) throw conflict("last_super_admin", LAST_SUPER_ADMIN_ERROR);
}

const canActivateAccounts = (actor: Actor) => isSuperAdmin(actor) || hasActiveRole(actor, "admin");

/** An Administrator target needs an Administrator or Super Administrator to activate it. */
function canActivateTarget(actor: Actor, account: Account): boolean {
  return !account.roleIds.includes("admin") || isSuperAdmin(actor) || hasActiveRole(actor, "admin");
}

/** Protected Super Administrator records stay with Super Administrators. */
function assertAccountEditable(actor: Actor, account: Account): void {
  if (isActiveSuperAdmin(account) && !isSuperAdmin(actor)) throw new ApiError(403, "forbidden", PROTECTED_ACCOUNT_ERROR);
}

async function uniqueEmail(email: string, exceptStaffId: string | null, exceptAccountId: string | null): Promise<void> {
  const lowered = email.toLowerCase();
  const [staff, accounts] = await Promise.all([loadStaff(), loadAccounts()]);
  if (staff.some((member) => member.id !== exceptStaffId && member.email.toLowerCase() === lowered)) throw conflict("staff_email_exists", "An employee with this email already exists.");
  if (accounts.some((account) => account.id !== exceptAccountId && account.email.toLowerCase() === lowered)) throw conflict("account_email_exists", "An account with this email already exists.");
}

async function createFirebaseUser(email: string, displayName: string): Promise<string | undefined> {
  try {
    const user = await getAuth(getAdminApp()).createUser({ email, displayName });
    return user.uid;
  } catch (error) {
    const code = error instanceof Error && "code" in error ? String((error as { code: unknown }).code) : "";
    if (code === "auth/email-already-exists") throw conflict("account_email_exists", "An account with this email already exists.");
    throw error;
  }
}

// ---------------------------------------------------------------- reads
export async function listDepartments(actor: Actor): Promise<Department[]> {
  if (!moduleGranted(actor, "departments")) return [];
  return loadDepartments();
}

export async function getDepartment(actor: Actor, id: string): Promise<Department> {
  requireModule(actor, "departments");
  const department = await loadDepartment(id);
  if (!department) throw notFound("Department");
  return department;
}

export async function listDepartmentRoles(actor: Actor): Promise<DepartmentRole[]> {
  if (!moduleGranted(actor, "roles")) return [];
  return loadDepartmentRoles();
}

export async function getDepartmentRole(actor: Actor, id: string): Promise<DepartmentRole> {
  requireModule(actor, "roles");
  const role = await loadDepartmentRole(id);
  if (!role) throw notFound("Role");
  return role;
}

/** Roles with the actor's authority over each, for Staff assignment and role actions (doc 01 section 5). */
export async function listRoleOptions(actor: Actor): Promise<DepartmentRoleOption[]> {
  if (!moduleGranted(actor, "roles") && !moduleGranted(actor, "staff")) return [];
  const [roles, departments] = await Promise.all([loadDepartmentRoles(), loadDepartments()]);
  return roles.map((role) => {
    const manageable = canManageRoleGrants(actor, role);
    const departmentActive = departments.some((department) => department.id === role.departmentId && department.status === "active");
    return { ...role, manageable, assignable: manageable && role.status === "active" && departmentActive };
  });
}

export async function listStaff(actor: Actor): Promise<StaffMember[]> {
  if (!moduleGranted(actor, "staff")) return [];
  return loadStaff();
}

export async function getStaff(actor: Actor, id: string): Promise<StaffMember> {
  requireModule(actor, "staff");
  const staff = await loadStaffMember(id);
  if (!staff) throw notFound("Staff member");
  return staff;
}

/** Uploads one staff avatar to private storage; the caller has checked Staff authority. */
export async function uploadStaffAvatar(actor: Actor, id: string, bytes: Buffer, originalName: string | null): Promise<{ avatarUrl: string }> {
  requireOperation(actor, "organization.staff.manage");
  const staff = await loadStaffMember(id);
  if (!staff) throw notFound("Staff member");
  return attachStaffAvatar(actor, id, await loadStaffProfile(id), bytes, originalName);
}

/** A person may read their own avatar; other staff need the Staff module. */
export async function downloadStaffAvatarImage(actor: Actor, id: string, fileId: string) {
  if (actor.identity.staffId !== id) requireModule(actor, "staff");
  return downloadStaffAvatar(id, await loadStaffProfile(id), fileId);
}

function linkedSummary(actor: Actor, staff: StaffMember, account: Account): LinkedAccountSummary {
  const protectedAccount = account.roleIds.includes("super_admin");
  const self = actor.identity.staffId === staff.id;
  const allowed =
    moduleGranted(actor, "staff") && !protectedAccount && !self
      ? ACCOUNT_STATUS_TRANSITIONS[account.status].filter((status) => STAFF_ACCOUNT_STATUSES.includes(status) && (status !== "active" || canActivateTarget(actor, account)))
      : [];
  return { id: account.id, email: account.email, status: account.status, isProtected: protectedAccount, allowedStatuses: [...allowed] };
}

export async function getStaffSelf(actor: Actor): Promise<StaffSelfProfile | null> {
  if (actor.identity.status !== "active" || !actor.identity.staffId) return null;
  const staff = await loadStaffMember(actor.identity.staffId);
  if (!staff) return null;
  const account = staff.accountId ? await loadAccount(staff.accountId) : null;
  return { staff, linkedAccount: account ? linkedSummary(actor, staff, account) : null };
}

export async function listStaffPolicies(actor: Actor): Promise<Record<string, StaffActionPolicy>> {
  if (!moduleGranted(actor, "staff")) return {};
  const [staff, roles, accounts] = await Promise.all([loadStaff(), loadDepartmentRoles(), loadAccounts()]);
  const accountsById = new Map(accounts.map((account) => [account.id, account]));
  const policies: Record<string, StaffActionPolicy> = {};
  for (const member of staff) {
    const account = member.accountId ? (accountsById.get(member.accountId) ?? null) : null;
    const self = actor.identity.staffId === member.id;
    const currentRole = member.departmentRoleId ? (roles.find((role) => role.id === member.departmentRoleId) ?? null) : null;
    const lockedProtected = Boolean(account?.roleIds.includes("super_admin")) && !isSuperAdmin(actor);
    let assignmentRestriction: string | null = null;
    if (self) assignmentRestriction = "You cannot change your own department or role.";
    else if (lockedProtected) assignmentRestriction = "Only a Super Administrator can change this record's department or role.";
    else if (currentRole && !canManageRoleGrants(actor, currentRole)) assignmentRestriction = "Your access does not cover this employee's current role.";
    const identityRestriction =
      account && account.roleIds.includes("super_admin") && !self && !isSuperAdmin(actor)
        ? "Only a Super Administrator can change this record's name or email."
        : null;
    policies[member.id] = { canDelete: false, deleteRestriction: STAFF_DELETE_DISABLED, assignmentRestriction, identityRestriction, linkedAccount: account ? linkedSummary(actor, member, account) : null };
  }
  return policies;
}

export async function listAccounts(actor: Actor): Promise<Account[]> {
  if (!moduleGranted(actor, "accounts")) return [];
  return loadAccounts();
}

export async function getAccount(actor: Actor, id: string): Promise<Account> {
  requireModule(actor, "accounts");
  const account = await loadAccount(id);
  if (!account) throw notFound("Account");
  return account;
}

function removesLastSuperAdmin(accounts: Account[], accountId: string, next: { roleIds: readonly string[]; status: string }): boolean {
  try {
    assertKeepsActiveSuperAdmin(accounts, accountId, next);
    return false;
  } catch {
    return true;
  }
}

function accountPolicy(actor: Actor, account: Account, accounts: Account[], staff: StaffMember[]): AccountActionPolicy {
  const linkedToStaff = staff.some((member) => member.accountId === account.id);
  const deletion = { canDelete: false, deleteRestriction: ACCOUNT_DELETE_DISABLED };
  const none = { canManageRoles: false, canResetPassword: false, assignableRoles: [], revocableRoles: [], allowedStatuses: [], linkedToStaff, ...deletion };
  if (isActiveSuperAdmin(account) && !isSuperAdmin(actor)) return { ...none, canEdit: false, restriction: PROTECTED_ACCOUNT_ERROR };
  if (account.id === actor.userId) return { ...none, canEdit: true, restriction: OWN_ACCOUNT_ERROR };
  const assignable = (role: DevRole) => canAssignSystemRole(actor, role);
  return {
    canEdit: true,
    canManageRoles: true,
    canResetPassword: canActivateAccounts(actor),
    assignableRoles: SYSTEM_ROLES.filter((role) => !account.roleIds.includes(role) && assignable(role)),
    revocableRoles: account.roleIds.filter((role) => assignable(role) && !removesLastSuperAdmin(accounts, account.id, { roleIds: account.roleIds.filter((item) => item !== role), status: account.status })),
    allowedStatuses: ACCOUNT_STATUS_TRANSITIONS[account.status].filter(
      (status) => (status !== "active" || canActivateTarget(actor, account)) && !removesLastSuperAdmin(accounts, account.id, { roleIds: account.roleIds, status }),
    ),
    restriction: null,
    linkedToStaff,
    ...deletion,
  };
}

export async function getAccountPolicies(actor: Actor): Promise<AccountPolicies> {
  if (!moduleGranted(actor, "accounts")) return { creatableRoles: [], accounts: {} };
  const [accounts, staff] = await Promise.all([loadAccounts(), loadStaff()]);
  const policies: Record<string, AccountActionPolicy> = {};
  for (const account of accounts) policies[account.id] = accountPolicy(actor, account, accounts, staff);
  const creatableRoles = SYSTEM_ROLES.filter((role) => canAssignSystemRole(actor, role));
  return { creatableRoles, accounts: policies };
}

// ---------------------------------------------------------------- departments
export async function createDepartment(actor: Actor, input: { name: string; code?: string; description?: string; headStaffId?: string | null; status?: "active" | "deactivated" }): Promise<Department> {
  requireOperation(actor, "organization.departments.manage");
  if (input.headStaffId) throw invalid("Department Head assignment is not supported yet.");
  const name = text(input.name);
  if (!name) throw invalid("Department name is required.", { name: "Department name is required." });
  const departments = await loadDepartments();
  if (departments.some((department) => department.name.toLowerCase() === name.toLowerCase())) throw conflict("department_exists", "A department with this name already exists.");
  const requestedCode = text(input.code).toUpperCase();
  if (requestedCode && departments.some((department) => department.code.toLowerCase() === requestedCode.toLowerCase())) throw conflict("department_code_exists", "A department with this code already exists.");
  const department: Department = {
    id: newId(),
    name,
    code: requestedCode || uniqueCode(codeFor(name), departments.map((item) => item.code)),
    description: text(input.description),
    headStaffId: null,
    status: normalizeStatus(input.status),
  };
  await transact(actor, {
    variableDefinitions: "$d: Department_Data!",
    fields: "department: department_insert(data: $d)",
    variables: { d: { id: department.id, name: department.name, code: department.code, description: department.description, status: department.status } },
    audit: [{ action: AUDIT_ACTIONS.DEPARTMENT_CREATED, entityType: "department", entityId: department.id, details: { module: "organization", newValue: name } }],
  });
  return department;
}

export async function updateDepartment(actor: Actor, id: string, input: { name?: string; code?: string; description?: string; headStaffId?: string | null; status?: "active" | "deactivated" }): Promise<Department> {
  requireOperation(actor, "organization.departments.manage");
  const department = await loadDepartment(id);
  if (!department) throw notFound("Department");
  if (input.headStaffId !== undefined) throw invalid("Department Head assignment is not supported yet.");
  const [departments, roles] = await Promise.all([loadDepartments(), loadDepartmentRoles()]);
  const next = { name: department.name, code: department.code, description: department.description, status: department.status };
  if (input.name !== undefined) {
    const name = text(input.name);
    if (!name) throw invalid("Department name is required.", { name: "Department name is required." });
    if (departments.some((item) => item.id !== id && item.name.toLowerCase() === name.toLowerCase())) throw conflict("department_exists", "A department with this name already exists.");
    next.name = name;
  }
  if (input.code !== undefined) {
    const code = text(input.code).toUpperCase();
    if (!code) throw invalid("Department code is required.");
    if (departments.some((item) => item.id !== id && item.code.toLowerCase() === code.toLowerCase())) throw conflict("department_code_exists", "A department with this code already exists.");
    next.code = code;
  }
  if (input.description !== undefined) next.description = text(input.description);
  if (input.status !== undefined) {
    const nextStatus = normalizeStatus(input.status);
    if (nextStatus !== department.status) {
      const departmentRoles = roles.filter((role) => role.departmentId === id);
      // Department status gates its roles' grants, so it gates the protected role too.
      if (departmentRoles.some((role) => role.isProtected) && !isSuperAdmin(actor)) throw new ApiError(403, "forbidden", PROTECTED_ROLE_ERROR);
      // Reactivation restores the grants of the department's active roles.
      if (nextStatus === "active") for (const role of departmentRoles.filter((item) => item.status === "active")) assertCanDelegate(actor, role.moduleIds);
    }
    next.status = nextStatus;
  }
  const changes: Array<[string, string, string]> = [];
  if (next.name !== department.name) changes.push(["name", department.name, next.name]);
  if (next.code !== department.code) changes.push(["code", department.code, next.code]);
  if (next.description !== department.description) changes.push(["description", "changed", "changed"]);
  const statusChanged = next.status !== department.status;
  await transact(actor, {
    variableDefinitions: "$id: UUID!, $d: Department_Data!",
    fields: "department: department_update(id: $id, data: $d)",
    variables: { id, d: next },
    audit: [
      ...(changes.length > 0
        ? [{ action: AUDIT_ACTIONS.DEPARTMENT_UPDATED, entityType: "department", entityId: id, details: { module: "organization", previousValue: changes.map(([field, before]) => `${field}:${before}`).join(";"), newValue: changes.map(([field, , after]) => `${field}:${after}`).join(";") } }]
        : []),
      ...(statusChanged
        ? [{ action: AUDIT_ACTIONS.DEPARTMENT_STATUS_CHANGED, entityType: "department", entityId: id, details: { module: "organization", previousValue: department.status, newValue: next.status } }]
        : []),
    ],
  });
  return { ...department, ...next };
}

export async function deleteDepartment(actor: Actor, id: string): Promise<void> {
  requireOperation(actor, "organization.departments.manage");
  const department = await loadDepartment(id);
  if (!department) throw notFound("Department");
  const [roles, staff] = await Promise.all([loadDepartmentRoles(), loadStaff()]);
  if (roles.some((role) => role.departmentId === id)) throw conflict("department_has_roles", "This department has assigned roles and cannot be deleted.");
  if (staff.some((member) => member.departmentId === id)) throw conflict("department_has_staff", "This department has assigned employees and cannot be deleted.");
  await transact(actor, {
    variableDefinitions: "$id: UUID!",
    fields: "department: department_delete(id: $id)",
    variables: { id },
    audit: [{ action: AUDIT_ACTIONS.DEPARTMENT_DELETED, entityType: "department", entityId: id, details: { module: "organization", previousValue: department.name } }],
  });
}

// ---------------------------------------------------------------- department roles
export async function createDepartmentRole(actor: Actor, input: { name: string; departmentId: string; moduleIds: string[]; status?: "active" | "deactivated" }): Promise<DepartmentRole> {
  requireOperation(actor, "organization.roles.manage");
  const name = text(input.name);
  if (!name) throw invalid("Role name is required.", { name: "Role name is required." });
  const department = await loadDepartment(input.departmentId);
  if (!department) throw invalid("Department does not exist.", { departmentId: "Choose a department." });
  if (department.status !== "active") throw conflict("department_inactive", "Roles cannot be created under a deactivated department.");
  if (!Array.isArray(input.moduleIds) || input.moduleIds.length === 0) throw invalid("At least one authorized module is required.", { moduleIds: "Choose at least one module." });
  const roles = await loadDepartmentRoles();
  if (roles.some((role) => role.departmentId === input.departmentId && role.name.toLowerCase() === name.toLowerCase())) throw conflict("role_exists", "A role with this name already exists in the department.");
  const moduleIds = [...new Set(input.moduleIds)];
  assertCanDelegate(actor, moduleIds);
  const role: DepartmentRole = {
    id: newId(),
    name,
    departmentId: department.id,
    moduleIds,
    status: normalizeStatus(input.status),
    createdAt: new Date().toISOString().slice(0, 10),
    isProtected: false,
  };
  await transact(actor, {
    variableDefinitions: "$d: DepartmentRole_Data!",
    fields: "role: departmentRole_insert(data: $d)",
    variables: { d: { id: role.id, name: role.name, departmentId: role.departmentId, moduleIds: role.moduleIds, status: role.status, isProtected: false } },
    audit: [{ action: AUDIT_ACTIONS.ROLE_CREATED, entityType: "department-role", entityId: role.id, details: { module: "organization", newValue: `${name} [${moduleIds.join(",")}]` } }],
  });
  return role;
}

export async function updateDepartmentRole(actor: Actor, id: string, input: { name?: string; departmentId?: string; moduleIds?: string[]; status?: "active" | "deactivated" }): Promise<DepartmentRole> {
  requireOperation(actor, "organization.roles.manage");
  const role = await loadDepartmentRole(id);
  if (!role) throw notFound("Role");
  // Any modification requires authority over everything the role confers.
  assertCanManageRoleGrants(actor, role);
  const [roles, staff] = await Promise.all([loadDepartmentRoles(), loadStaff()]);
  const next = { name: role.name, departmentId: role.departmentId, moduleIds: role.moduleIds, status: role.status };
  if (input.name !== undefined) {
    const name = text(input.name);
    if (!name) throw invalid("Role name is required.");
    next.name = name;
  }
  if (input.departmentId !== undefined && input.departmentId !== role.departmentId) {
    if (staff.some((member) => member.departmentRoleId === id)) throw conflict("role_assigned", "This role cannot be transferred while staff members are assigned to it.");
    const department = await loadDepartment(input.departmentId);
    if (!department) throw invalid("Department does not exist.");
    if (department.status !== "active") throw conflict("department_inactive", "Roles cannot be moved to a deactivated department.");
    next.departmentId = department.id;
  }
  if (roles.some((item) => item.id !== id && item.departmentId === next.departmentId && item.name.toLowerCase() === next.name.toLowerCase())) {
    throw conflict("role_exists", "A role with this name already exists in the department.");
  }
  if (input.moduleIds !== undefined) {
    if (!Array.isArray(input.moduleIds) || input.moduleIds.length === 0) throw invalid("At least one authorized module is required.");
    const current = new Set(role.moduleIds);
    assertCanDelegate(actor, [...new Set(input.moduleIds)].filter((moduleId) => !current.has(moduleId)));
    next.moduleIds = [...new Set(input.moduleIds)];
  }
  if (input.status !== undefined) next.status = normalizeStatus(input.status);
  const changes: Array<[string, string, string]> = [];
  if (next.name !== role.name) changes.push(["name", role.name, next.name]);
  if (next.departmentId !== role.departmentId) changes.push(["department", role.departmentId, next.departmentId]);
  const sameModules = next.moduleIds.length === role.moduleIds.length && next.moduleIds.every((moduleId) => role.moduleIds.includes(moduleId));
  if (!sameModules) changes.push(["modules", role.moduleIds.join(","), next.moduleIds.join(",")]);
  if (next.status !== role.status) changes.push(["status", role.status, next.status]);
  await transact(actor, {
    variableDefinitions: "$id: UUID!, $d: DepartmentRole_Data!",
    fields: "role: departmentRole_update(id: $id, data: $d)",
    variables: { id, d: { name: next.name, departmentId: next.departmentId, moduleIds: next.moduleIds, status: next.status } },
    audit:
      changes.length > 0
        ? [{ action: AUDIT_ACTIONS.ROLE_UPDATED, entityType: "department-role", entityId: id, details: { module: "organization", previousValue: changes.map(([field, before]) => `${field}:${before}`).join(";"), newValue: changes.map(([field, , after]) => `${field}:${after}`).join(";") } }]
        : [],
  });
  return { ...role, ...next };
}

export async function deleteDepartmentRole(actor: Actor, id: string): Promise<void> {
  requireOperation(actor, "organization.roles.manage");
  const role = await loadDepartmentRole(id);
  if (!role) throw notFound("Role");
  assertCanManageRoleGrants(actor, role);
  const staff = await loadStaff();
  const assigned = staff.filter((member) => member.departmentRoleId === id);
  if (assigned.length > 0) throw conflict("role_assigned", `This role is assigned to ${assigned.length} staff member(s) and cannot be deleted.`);
  await transact(actor, {
    variableDefinitions: "$id: UUID!",
    fields: "role: departmentRole_delete(id: $id)",
    variables: { id },
    audit: [{ action: AUDIT_ACTIONS.ROLE_DELETED, entityType: "department-role", entityId: id, details: { module: "organization", previousValue: `${role.name} [${role.moduleIds.join(",")}]` } }],
  });
}

// ---------------------------------------------------------------- staff
function assertCompatibleRole(roles: DepartmentRole[], roleId: string | null | undefined, departmentId: string | null): DepartmentRole | null {
  if (!roleId) return null;
  const role = roles.find((item) => item.id === roleId);
  if (!role) throw invalid("Assigned department role does not exist.");
  if (role.departmentId !== departmentId) throw invalid("Assigned department role does not belong to the staff member's department.");
  if (role.status !== "active") throw invalid("Assigned department role is not active.");
  return role;
}

async function assertAssignableDepartment(departmentId: string): Promise<Department> {
  const department = await loadDepartment(departmentId);
  if (!department) throw invalid("Invalid department reference.");
  if (department.status !== "active") throw invalid("Staff cannot be assigned to a deactivated department.");
  return department;
}

export async function createStaff(
  actor: Actor,
  input: {
    displayName: string; position: string; departmentId?: string | null; departmentRoleId?: string | null; email: string;
    avatarUrl?: string | null; accountId?: string | null; provisionPendingAccount?: boolean; systemRoleIds?: string[];
  } & StaffProfileInput,
): Promise<StaffMember> {
  requireOperation(actor, "organization.staff.manage");
  const displayName = text(input.displayName);
  if (!displayName) throw invalid("Display name is required.", { displayName: "Display name is required." });
  const email = text(input.email);
  if (!email) throw invalid("Email is required.", { email: "Email is required." });
  const position = text(input.position);
  if (!position) throw invalid("Position is required.");
  const departmentId = input.departmentId ?? null;
  if (departmentId) await assertAssignableDepartment(departmentId);
  const roles = await loadDepartmentRoles();
  if (input.departmentRoleId) {
    const role = assertCompatibleRole(roles, input.departmentRoleId, departmentId);
    if (role) assertCanManageRoleGrants(actor, role);
  }
  const requestedRoleIds = [...new Set(input.systemRoleIds ?? [])];
  const unknown = requestedRoleIds.find((role) => !(SYSTEM_ROLES as readonly string[]).includes(role));
  if (unknown) throw invalid("Unknown system role.");
  const systemRoleIds = requestedRoleIds as DevRole[];
  if (systemRoleIds.length > 0) {
    if (!input.provisionPendingAccount) throw invalid("System roles can only be granted to a newly provisioned account.");
    requireModule(actor, "accounts");
    if (systemRoleIds.includes("super_admin") && !isSuperAdmin(actor)) throw invalid("Cannot create a protected Super Administrator account.");
    for (const role of systemRoleIds) assertCanAssignSystemRole(actor, role);
  }
  if (input.provisionPendingAccount && input.accountId) throw invalid("A staff record cannot link an existing account and provision a new one.");
  const existingAccount = input.accountId ? await loadAccount(input.accountId) : null;
  if (input.accountId && !existingAccount) throw invalid("The linked account does not exist.");
  if (existingAccount && isActiveSuperAdmin(existingAccount) && !isSuperAdmin(actor)) throw new ApiError(403, "forbidden", PROTECTED_STAFF_ERROR);
  if (existingAccount) {
    const alreadyLinked = await loadStaffForAccount(existingAccount.id);
    if (alreadyLinked) throw conflict("account_linked", "This account is already linked to a staff record.");
    await uniqueEmail(email, null, existingAccount.id);
  } else {
    await uniqueEmail(email, null, null);
  }

  const staffId = newId();
  const profile = { ...profileData(input), avatarUrl: input.avatarUrl ?? null };
  validateGovernmentIdProfile(profile);
  const staffData = { id: staffId, displayName, position, departmentId: departmentId ?? undefined, departmentRoleId: input.departmentRoleId ?? undefined, status: "active", email, profile };
  const firebaseUid = input.provisionPendingAccount ? await createFirebaseUser(email, displayName) : undefined;
  const accountId = input.provisionPendingAccount ? newId() : (input.accountId ?? null);
  const audit = { action: AUDIT_ACTIONS.STAFF_CREATED, entityType: "staff", entityId: staffId, details: { module: "organization", newValue: systemRoleIds.length > 0 ? `active; system roles [${[...systemRoleIds].sort().join(",")}]` : "active", ...(accountId ? { accountId } : {}) } };
  try {
    if (input.provisionPendingAccount && accountId) {
      await transact(actor, {
        variableDefinitions: ["$staff: StaffMember_Data!", "$account: UserAccount_Data!", ...(systemRoleIds.length > 0 ? ["$roles: [RoleAssignment_Data!]!"] : [])].join(", "),
        fields: ["staff: staffMember_insert(data: $staff)", "account: userAccount_insert(data: $account)", ...(systemRoleIds.length > 0 ? ["roles: roleAssignment_insertMany(data: $roles)"] : [])].join("\n"),
        variables: {
          staff: staffData,
          account: { id: accountId, email, displayName, status: "pending", portal: portalForRoles(systemRoleIds), staffId, firebaseUid, createdById: actor.userId },
          ...(systemRoleIds.length > 0 ? { roles: systemRoleIds.map((role) => ({ userId: accountId, role, status: "active" })) } : {}),
        },
        audit: [audit],
      });
    } else if (accountId) {
      await transact(actor, {
        variableDefinitions: "$staff: StaffMember_Data!, $accountId: UUID!, $account: UserAccount_Data!",
        fields: ["staff: staffMember_insert(data: $staff)", "account: userAccount_update(id: $accountId, data: $account)"].join("\n"),
        variables: { staff: staffData, accountId, account: { staffId } },
        audit: [audit],
      });
    } else {
      await transact(actor, { variableDefinitions: "$staff: StaffMember_Data!", fields: "staff: staffMember_insert(data: $staff)", variables: { staff: staffData }, audit: [audit] });
    }
  } catch (error) {
    if (firebaseUid) await getAuth(getAdminApp()).deleteUser(firebaseUid).catch(() => undefined);
    throw error;
  }
  return { id: staffId, displayName, position, departmentId, departmentRoleId: input.departmentRoleId ?? null, status: "active", email, createdAt: new Date().toISOString().slice(0, 10), accountId, ...profile } as StaffMember;
}

export async function updateStaff(
  actor: Actor,
  id: string,
  input: {
    displayName?: string; position?: string; departmentId?: string | null; departmentRoleId?: string | null; status?: StaffMember["status"];
    avatarUrl?: string | null; accountId?: string | null; email?: string;
  } & StaffProfileInput,
): Promise<StaffMember> {
  requireOperation(actor, "organization.staff.manage");
  const staff = await loadStaffMember(id);
  if (!staff) throw notFound("Staff member");
  if (input.status !== undefined) throw invalid("Employment status changes are not supported.");
  const roles = await loadDepartmentRoles();
  const next = { displayName: staff.displayName, position: staff.position, email: staff.email, departmentId: staff.departmentId, departmentRoleId: staff.departmentRoleId, avatarUrl: staff.avatarUrl, accountId: staff.accountId };
  if (input.displayName !== undefined) {
    const displayName = text(input.displayName);
    if (!displayName) throw invalid("Display name is required.");
    next.displayName = displayName;
  }
  if (input.position !== undefined) next.position = text(input.position);
  if (input.email !== undefined) {
    const email = text(input.email);
    if (!email) throw invalid("Email is required.");
    next.email = email;
  }
  if (input.departmentId !== undefined) {
    if (input.departmentId && input.departmentId !== staff.departmentId) await assertAssignableDepartment(input.departmentId);
    next.departmentId = input.departmentId;
    const currentRole = next.departmentRoleId ? roles.find((role) => role.id === next.departmentRoleId) : null;
    if (currentRole && currentRole.departmentId !== next.departmentId) next.departmentRoleId = null;
  }
  if (input.departmentRoleId !== undefined) {
    if (input.departmentRoleId) assertCompatibleRole(roles, input.departmentRoleId, next.departmentId);
    next.departmentRoleId = input.departmentRoleId;
  }
  if (input.avatarUrl !== undefined) {
    // The upload route owns the URL; an ordinary save may only clear it. The newest value is read again below.
    next.avatarUrl = input.avatarUrl;
  }
  if (input.accountId !== undefined) next.accountId = input.accountId;

  const departmentChanged = next.departmentId !== staff.departmentId;
  const roleChanged = next.departmentRoleId !== staff.departmentRoleId;
  const accountChanged = next.accountId !== staff.accountId;
  const identityChanged = next.displayName !== staff.displayName || next.email.toLowerCase() !== staff.email.toLowerCase();
  const linked = accountChanged ? null : staff.accountId ? await loadAccount(staff.accountId) : null;
  if (departmentChanged || roleChanged || accountChanged) {
    if (actor.identity.staffId === staff.id && !isSuperAdmin(actor)) throw new ApiError(403, "forbidden", SELF_MODIFICATION_ERROR);
    if (linked && linked.roleIds.includes("super_admin") && !isSuperAdmin(actor)) throw new ApiError(403, "forbidden", PROTECTED_STAFF_ERROR);
  }
  if (roleChanged) {
    const previousRole = staff.departmentRoleId ? (roles.find((role) => role.id === staff.departmentRoleId) ?? null) : null;
    if (previousRole) assertCanManageRoleGrants(actor, previousRole);
    const nextRole = next.departmentRoleId ? (roles.find((role) => role.id === next.departmentRoleId) ?? null) : null;
    if (nextRole) {
      const department = await loadDepartment(nextRole.departmentId);
      if (!department || department.status !== "active") throw invalid("Assigned department role belongs to a deactivated department.");
      assertCanManageRoleGrants(actor, nextRole);
    }
  }
  if (accountChanged && next.accountId) {
    const target = await loadAccount(next.accountId);
    if (!target) throw invalid("The linked account does not exist.");
    if (isActiveSuperAdmin(target) && !isSuperAdmin(actor)) throw new ApiError(403, "forbidden", PROTECTED_STAFF_ERROR);
  }
  if (linked && identityChanged) {
    if (linked.roleIds.includes("super_admin") && actor.identity.staffId !== staff.id && !isSuperAdmin(actor)) throw new ApiError(403, "forbidden", PROTECTED_STAFF_ERROR);
  }
  if (next.email.toLowerCase() !== staff.email.toLowerCase()) await uniqueEmail(next.email, staff.id, linked?.id ?? null);

  const changes: Array<[string, string | null, string | null]> = [];
  if (next.displayName !== staff.displayName) changes.push(["displayName", staff.displayName, next.displayName]);
  if (next.email.toLowerCase() !== staff.email.toLowerCase()) changes.push(["email", staff.email, next.email]);
  if (next.departmentId !== staff.departmentId) changes.push(["department", staff.departmentId, next.departmentId]);
  if (next.departmentRoleId !== staff.departmentRoleId) changes.push(["role", staff.departmentRoleId, next.departmentRoleId]);
  if (next.accountId !== staff.accountId) changes.push(["account", staff.accountId, next.accountId]);
  const describe = (value: string | null) => value ?? "none";
  // Read the profile again just before the write: an avatar upload may have committed while the checks ran.
  const latest = await loadStaffProfile(id);
  const latestAvatarUrl = typeof latest?.avatarUrl === "string" ? latest.avatarUrl : null;
  // The newest profile is authoritative for the avatar; only a missing profile row falls back to the request.
  next.avatarUrl = input.avatarUrl === null ? null : latest ? latestAvatarUrl : (input.avatarUrl ?? next.avatarUrl);
  const nextProfile = mergeStaffProfile(latest ?? storedProfile(staff), profileData(input), next.avatarUrl ?? null);
  // A legacy ID number stays saveable while it is unchanged; the current format is enforced when the ID is edited.
  const previousIdType = (latest?.governmentIdType as string | undefined) ?? null;
  const previousIdNumber = (latest?.governmentIdNumber as string | undefined) ?? null;
  const nextIdType = (nextProfile.governmentIdType as string | undefined) ?? null;
  const nextIdNumber = (nextProfile.governmentIdNumber as string | undefined) ?? null;
  if (nextIdType !== previousIdType || nextIdNumber !== previousIdNumber) validateGovernmentIdProfile(nextProfile as Record<string, string | null>);
  const syncAccount = Boolean(linked && identityChanged);
  await transact(actor, {
    variableDefinitions: ["$id: UUID!", "$staff: StaffMember_Data!", ...(syncAccount ? ["$syncId: UUID!", "$sync: UserAccount_Data!"] : [])].join(", "),
    fields: ["staff: staffMember_update(id: $id, data: $staff)", ...(syncAccount ? ["account: userAccount_update(id: $syncId, data: $sync)"] : [])].join("\n"),
    variables: {
      id,
      staff: { displayName: next.displayName, position: next.position, email: next.email, departmentId: next.departmentId ?? undefined, departmentRoleId: next.departmentRoleId ?? undefined, profile: nextProfile },
      ...(syncAccount ? { syncId: linked!.id, sync: { displayName: next.displayName, email: next.email } } : {}),
    },
    audit:
      changes.length > 0
        ? [{ action: AUDIT_ACTIONS.STAFF_UPDATED, entityType: "staff", entityId: id, details: { module: "organization", previousValue: changes.map(([field, before]) => `${field}:${describe(before)}`).join(";"), newValue: changes.map(([field, , after]) => `${field}:${describe(after)}`).join(";") } }]
        : [],
  });
  if (input.avatarUrl === null) await deleteStaffAvatar(latest);
  return { ...staff, ...next, ...profileData(input) } as StaffMember;
}

export async function updateLinkedAccountStatus(actor: Actor, staffId: string, status: AccountStatus): Promise<LinkedAccountSummary> {
  requireOperation(actor, "organization.staff.manage");
  const staff = await loadStaffMember(staffId);
  if (!staff) throw notFound("Staff member");
  if (!staff.accountId) throw conflict("no_linked_account", "This staff record has no linked account.");
  const account = await loadAccount(staff.accountId);
  if (!account) throw notFound("Account");
  if (!STAFF_ACCOUNT_STATUSES.includes(status)) throw invalid("This account status cannot be set from Staff & Access.");
  if (account.roleIds.includes("super_admin")) throw new ApiError(403, "forbidden", PROTECTED_ACCOUNT_ERROR);
  if (status === "active" && !canActivateTarget(actor, account)) throw new ApiError(403, "forbidden", ADMIN_ACTIVATION_ERROR);
  if (actor.identity.staffId === staff.id && !isSuperAdmin(actor)) throw new ApiError(403, "forbidden", SELF_MODIFICATION_ERROR);
  if (!ACCOUNT_STATUS_TRANSITIONS[account.status].includes(status)) throw conflict("invalid_transition", `Invalid status transition from ${account.status} to ${status}.`);
  const accounts = await loadAccounts();
  assertKeepsActiveSuperAdmin(accounts, account.id, { roleIds: account.roleIds, status });
  const selfApproved = account.status === "pending" && status === "active" && account.createdBy === actor.userId;
  await transact(actor, {
    variableDefinitions: "$id: UUID!, $status: String!, $event: AccountStatusEvent_Data!",
    fields: ["account: userAccount_update(id: $id, data: { status: $status })", "event: accountStatusEvent_insert(data: $event)"].join("\n"),
    variables: { id: account.id, status, event: { accountId: account.id, actorId: actor.userId, previousStatus: account.status, newStatus: status, reason: selfApproved ? "Self-approved: the approver also requested this account." : undefined } },
    audit: [{ action: AUDIT_ACTIONS.ACCOUNT_STATUS_CHANGED, entityType: "account", entityId: account.id, details: { module: "organization", previousValue: account.status, newValue: status, ...(selfApproved ? { reason: "Self-approved" } : {}) } }],
  });
  return linkedSummary(actor, staff, { ...account, status });
}

export async function deleteStaff(actor: Actor, id: string): Promise<void> {
  requireOperation(actor, "organization.staff.manage");
  const staff = await loadStaffMember(id);
  if (!staff) throw notFound("Staff member");
  throw conflict("deletion_disabled", STAFF_DELETE_DISABLED);
}

// ---------------------------------------------------------------- accounts
export async function createAccount(actor: Actor, input: { displayName: string; email: string; roleIds: string[]; departmentId?: string | null }): Promise<Account> {
  requireModule(actor, "accounts");
  if (input.departmentId) throw invalid("Assign a department through Staff & Access when the account is linked to an employee.");
  const displayName = text(input.displayName);
  const email = text(input.email);
  if (!displayName) throw invalid("Display name is required.", { displayName: "Display name is required." });
  if (!email) throw invalid("Email is required.", { email: "Email is required." });
  const roleIds = [...new Set(input.roleIds)] as DevRole[];
  const unknown = roleIds.find((role) => !(SYSTEM_ROLES as readonly string[]).includes(role));
  if (unknown) throw invalid("Unknown system role.");
  if (roleIds.includes("super_admin") && !isSuperAdmin(actor)) throw new ApiError(403, "forbidden", "Cannot create a protected Super Administrator account.");
  for (const role of roleIds) assertCanAssignSystemRole(actor, role);
  await uniqueEmail(email, null, null);
  const accountId = newId();
  const firebaseUid = await createFirebaseUser(email, displayName);
  try {
    await transact(actor, {
      variableDefinitions: ["$account: UserAccount_Data!", ...(roleIds.length > 0 ? ["$roles: [RoleAssignment_Data!]!"] : [])].join(", "),
      fields: ["account: userAccount_insert(data: $account)", ...(roleIds.length > 0 ? ["roles: roleAssignment_insertMany(data: $roles)"] : [])].join("\n"),
      variables: {
        account: { id: accountId, email, displayName, status: "pending", portal: portalForRoles(roleIds), firebaseUid, createdById: actor.userId },
        ...(roleIds.length > 0 ? { roles: roleIds.map((role) => ({ userId: accountId, role, status: "active" })) } : {}),
      },
      audit: [{ action: AUDIT_ACTIONS.ACCOUNT_CREATED, entityType: "account", entityId: accountId, details: { module: "organization", newValue: roleIds.length > 0 ? `pending [${[...roleIds].sort().join(",")}]` : "pending" } }],
    });
  } catch (error) {
    if (firebaseUid) await getAuth(getAdminApp()).deleteUser(firebaseUid).catch(() => undefined);
    throw error;
  }
  return { id: accountId, displayName, email, roleIds, status: "pending", departmentId: null, createdAt: new Date().toISOString().slice(0, 10), createdBy: actor.userId };
}

export async function updateAccount(actor: Actor, id: string, input: { displayName?: string; email?: string; departmentId?: string | null }): Promise<Account> {
  requireModule(actor, "accounts");
  const account = await loadAccount(id);
  if (!account) throw notFound("Account");
  assertAccountEditable(actor, account);
  const staff = await loadStaffForAccount(id);
  const next = { displayName: account.displayName, email: account.email };
  if (input.displayName !== undefined) {
    const displayName = text(input.displayName);
    if (!displayName) throw invalid("Display name is required.");
    if (staff && displayName !== account.displayName) throw invalid(LINKED_ACCOUNT_ERROR);
    next.displayName = displayName;
  }
  if (input.email !== undefined) {
    const email = text(input.email);
    if (!email) throw invalid("Email is required.");
    if (staff && email.toLowerCase() !== account.email.toLowerCase()) throw invalid(LINKED_ACCOUNT_ERROR);
    if (next.email.toLowerCase() !== account.email.toLowerCase()) await uniqueEmail(email, staff?.id ?? null, account.id);
    next.email = email;
  }
  if (input.departmentId !== undefined && input.departmentId !== account.departmentId) throw invalid("The department is managed through the linked staff record in Staff & Access.");
  const changes: Array<[string, string, string]> = [];
  if (next.displayName !== account.displayName) changes.push(["displayName", account.displayName, next.displayName]);
  if (next.email.toLowerCase() !== account.email.toLowerCase()) changes.push(["email", account.email, next.email]);
  await transact(actor, {
    variableDefinitions: "$id: UUID!, $data: UserAccount_Data!",
    fields: "account: userAccount_update(id: $id, data: $data)",
    variables: { id, data: next },
    audit: changes.length > 0 ? [{ action: AUDIT_ACTIONS.ACCOUNT_UPDATED, entityType: "account", entityId: id, details: { module: "organization", previousValue: changes.map(([field, before]) => `${field}:${before}`).join(";"), newValue: changes.map(([field, , after]) => `${field}:${after}`).join(";") } }] : [],
  });
  return { ...account, ...next };
}

type AssignmentRow = { role: string; status: string };

/**
 * A member link grants a sales role on the account, which is an Accounts access change. It therefore needs
 * the same authority as a role change from the Accounts screen, not the Sales Network record permission.
 * Returns the account the caller is allowed to change.
 */
export async function assertCanChangeSalesAccountRole(actor: Actor, accountId: string, roles: readonly DevRole[]): Promise<Account> {
  requireModule(actor, "accounts");
  const account = await loadAccount(accountId);
  if (!account) throw invalid("The linked account does not exist.");
  assertAccountEditable(actor, account);
  if (actor.userId === account.id && !isSuperAdmin(actor)) throw new ApiError(403, "forbidden", OWN_ACCOUNT_ERROR);
  for (const role of roles) assertCanAssignSystemRole(actor, role);
  return account;
}

async function loadAssignments(accountId: string): Promise<AssignmentRow[]> {
  const result = await dbRead<{ roleAssignments: AssignmentRow[] }>(`query($id: UUID!) { roleAssignments(where: { userId: { eq: $id } }) { role status } }`, { id: accountId });
  return result.roleAssignments;
}

export async function assignAccountRole(actor: Actor, id: string, role: DevRole): Promise<Account> {
  requireModule(actor, "accounts");
  const account = await loadAccount(id);
  if (!account) throw notFound("Account");
  assertAccountEditable(actor, account);
  if (actor.userId === account.id && !isSuperAdmin(actor)) throw new ApiError(403, "forbidden", OWN_ACCOUNT_ERROR);
  assertCanAssignSystemRole(actor, role);
  if (account.roleIds.includes(role)) throw conflict("role_assigned", "This role is already assigned.");
  const assignments = await loadAssignments(id);
  const existing = assignments.some((assignment) => assignment.role === role);
  await transact(actor, {
    variableDefinitions: "$id: UUID!, $role: String!",
    fields: existing
      ? "assignment: roleAssignment_update(key: { userId: $id, role: $role }, data: { status: \"active\" })"
      : "assignment: roleAssignment_insert(data: { userId: $id, role: $role, status: \"active\" })",
    variables: { id, role },
    audit: [{ action: AUDIT_ACTIONS.ACCOUNT_ROLE_ASSIGNED, entityType: "account", entityId: id, details: { module: "organization", newValue: role } }],
  });
  return { ...account, roleIds: [...account.roleIds, role] };
}

export async function revokeAccountRole(actor: Actor, id: string, role: DevRole): Promise<Account> {
  requireModule(actor, "accounts");
  const account = await loadAccount(id);
  if (!account) throw notFound("Account");
  assertAccountEditable(actor, account);
  if (actor.userId === account.id && !isSuperAdmin(actor)) throw new ApiError(403, "forbidden", OWN_ACCOUNT_ERROR);
  assertCanAssignSystemRole(actor, role);
  if (!account.roleIds.includes(role)) throw conflict("role_not_assigned", "This role is not assigned.");
  const accounts = await loadAccounts();
  assertKeepsActiveSuperAdmin(accounts, id, { roleIds: account.roleIds.filter((item) => item !== role), status: account.status });
  await transact(actor, {
    variableDefinitions: "$id: UUID!, $role: String!",
    fields: "assignment: roleAssignment_update(key: { userId: $id, role: $role }, data: { status: \"inactive\" })",
    variables: { id, role },
    audit: [{ action: AUDIT_ACTIONS.ACCOUNT_ROLE_REVOKED, entityType: "account", entityId: id, details: { module: "organization", previousValue: role } }],
  });
  return { ...account, roleIds: account.roleIds.filter((item) => item !== role) };
}

export async function updateAccountStatus(actor: Actor, id: string, status: AccountStatus): Promise<Account> {
  requireModule(actor, "accounts");
  const account = await loadAccount(id);
  if (!account) throw notFound("Account");
  assertAccountEditable(actor, account);
  if (actor.userId === account.id && !isSuperAdmin(actor)) throw new ApiError(403, "forbidden", OWN_ACCOUNT_ERROR);
  if (!ACCOUNT_STATUS_TRANSITIONS[account.status].includes(status)) throw conflict("invalid_transition", `Invalid status transition from ${account.status} to ${status}.`);
  if (status === "active" && !canActivateAccounts(actor)) throw new ApiError(403, "forbidden", "Only an Administrator or Super Administrator can activate or reactivate accounts.");
  const accounts = await loadAccounts();
  assertKeepsActiveSuperAdmin(accounts, id, { roleIds: account.roleIds, status });
  const selfApproved = account.status === "pending" && status === "active" && account.createdBy === actor.userId;
  await transact(actor, {
    variableDefinitions: "$id: UUID!, $status: String!, $event: AccountStatusEvent_Data!",
    fields: ["account: userAccount_update(id: $id, data: { status: $status })", "event: accountStatusEvent_insert(data: $event)"].join("\n"),
    variables: { id, status, event: { accountId: id, actorId: actor.userId, previousStatus: account.status, newStatus: status, reason: selfApproved ? "Self-approved: the approver also requested this account." : undefined } },
    audit: [{ action: AUDIT_ACTIONS.ACCOUNT_STATUS_CHANGED, entityType: "account", entityId: id, details: { module: "organization", previousValue: account.status, newValue: status, ...(selfApproved ? { reason: "Self-approved" } : {}) } }],
  });
  return { ...account, status };
}

/** Requests a Firebase password-reset email. A signed-in user may reset their own; managing another account needs Accounts authority. Never generates, returns or stores a password. */
export async function requestPasswordReset(actor: Actor, id: string): Promise<{ email: string; resetLink?: string }> {
  const self = actor.userId === id;
  if (!self) {
    // Check authority before loading another account, so the response cannot reveal whether an ID exists.
    requireModule(actor, "accounts");
    if (!canActivateAccounts(actor)) throw new ApiError(403, "forbidden", "Only an Administrator or Super Administrator can reset a password.");
  }
  const account = await loadAccount(id);
  if (!account) throw notFound("Account");
  if (!self) assertAccountEditable(actor, account);
  const link = await getAuth(getAdminApp()).generatePasswordResetLink(account.email);
  await transact(actor, {
    variableDefinitions: "",
    fields: "",
    variables: {},
    audit: [{ action: AUDIT_ACTIONS.ACCOUNT_PASSWORD_RESET, entityType: "account", entityId: id, details: { module: "organization", channel: "email", ...(self ? { self: true } : {}) } }],
  });
  // The Auth emulator has no mail delivery; local QA uses the generated link. Never returned outside local emulator work.
  return { email: account.email, ...(process.env.FIREBASE_AUTH_EMULATOR_HOST ? { resetLink: link } : {}) };
}
