import type { Customer } from "@/modules/customers/types";
import type { OrgMember, Department, DepartmentRole, StaffMember } from "@/modules/organization/types";
import type { VipProduct } from "@/modules/vip/types";
import type { Account } from "@/modules/accounts/types";

export type MockStore = {
  members: OrgMember[];
  customers: Customer[];
  products: VipProduct[];
  accounts: Account[];
  departments: Department[];
  roles: DepartmentRole[];
  staff: StaffMember[];
  customerSequence: number;
  accountSequence: number;
  departmentSequence: number;
  roleSequence: number;
  staffSequence: number;
};

const members: OrgMember[] = [
  { id: "mem-svd-a", displayName: "SVD Alpha", designation: "SVD", branchId: "branch-a", parentId: null, status: "active" },
  { id: "mem-ssm-a", displayName: "SSM Alpha", designation: "SSM", branchId: "branch-a", parentId: "mem-svd-a", status: "active" },
  { id: "mem-sm-a", displayName: "SM Alpha", designation: "SM", branchId: "branch-a", parentId: "mem-ssm-a", status: "active" },
  { id: "mem-ost-a1", displayName: "OST Alpha One", designation: "OST", branchId: "branch-a", parentId: "mem-sm-a", status: "active" },
  { id: "mem-ost-a2", displayName: "OST Alpha Two", designation: "OST", branchId: "branch-a", parentId: "mem-svd-a", status: "active" },
  { id: "mem-svd-b", displayName: "SVD Beta", designation: "SVD", branchId: "branch-b", parentId: null, status: "active" },
  { id: "mem-ost-b1", displayName: "OST Beta One", designation: "OST", branchId: "branch-b", parentId: "mem-svd-b", status: "active" },
];

const customers: Customer[] = [
  { id: "cust-a1", displayName: "Customer A One", branchId: "branch-a", ownerMemberId: "mem-ost-a1", status: "submitted" },
  { id: "cust-a2", displayName: "Customer A Two", branchId: "branch-a", ownerMemberId: "mem-sm-a", status: "draft" },
  { id: "cust-b1", displayName: "Customer B One", branchId: "branch-b", ownerMemberId: "mem-ost-b1", status: "submitted" },
];

const products: VipProduct[] = [
  { code: "B1", name: "Bronze VIP", tier: "Bronze" },
  { code: "S1", name: "Silver VIP", tier: "Silver" },
  { code: "G1", name: "Gold VIP", tier: "Gold" },
];

const accounts: Account[] = [
  { id: "acct-super-admin", displayName: "Super Admin", email: "superadmin@afhomes.local", roleIds: ["super_admin"], status: "active", departmentId: null, createdAt: "2026-01-01" },
  { id: "acct-admin", displayName: "Administrator", email: "admin@afhomes.local", roleIds: ["admin"], status: "active", departmentId: null, createdAt: "2026-01-02" },
  { id: "acct-hr", displayName: "HR User", email: "hr@afhomes.local", roleIds: ["hr"], status: "active", departmentId: null, createdAt: "2026-01-03" },
  { id: "acct-finance", displayName: "Finance User", email: "finance@afhomes.local", roleIds: ["finance"], status: "active", departmentId: null, createdAt: "2026-01-04" },
  { id: "acct-pending", displayName: "Pending User", email: "pending@afhomes.local", roleIds: [], status: "pending", departmentId: null, createdAt: "2026-01-05" },
];

const departments: Department[] = [
  { id: "dept-hr", name: "Human Resources", code: "HR", description: "Human Resources department", headStaffId: null, status: "active" },
  { id: "dept-finance", name: "Finance", code: "FIN", description: "Finance department", headStaffId: null, status: "active" },
  { id: "dept-ops", name: "Operations", code: "OPS", description: "Operations department", headStaffId: null, status: "active" },
  { id: "dept-admin", name: "Admin", code: "ADM", description: "Administration department", headStaffId: null, status: "active" },
  { id: "dept-sales", name: "Sales", code: "SLS", description: "Sales department", headStaffId: null, status: "active" },
];

const roles: DepartmentRole[] = [
  { id: "role-hr-staff", name: "HR Staff", departmentId: "dept-hr", moduleIds: ["dashboard", "departments", "staff"], status: "active", createdAt: "2026-01-01" },
  { id: "role-fin-staff", name: "Finance Staff", departmentId: "dept-finance", moduleIds: ["dashboard", "finance"], status: "active", createdAt: "2026-01-01" },
  { id: "role-ops-staff", name: "Operations Staff", departmentId: "dept-ops", moduleIds: ["dashboard"], status: "active", createdAt: "2026-01-01" },
  // Single Roles concept: one department Role per system account role, each
  // belonging to exactly one department. Module grants mirror the system
  // grants intersected with delegable modules; system-only privileges
  // (finance operations, protected super-admin rights, sales-network scope)
  // still come from the linked account's system role, never from these grants.
  { id: "role-super-admin", name: "Super Admin", departmentId: "dept-admin", moduleIds: ["dashboard", "departments", "roles", "staff", "accounts"], status: "active", createdAt: "2026-01-01" },
  { id: "role-admin", name: "Administrator", departmentId: "dept-admin", moduleIds: ["dashboard", "departments", "roles", "staff", "accounts"], status: "active", createdAt: "2026-01-01" },
  { id: "role-hr", name: "Human Resources", departmentId: "dept-hr", moduleIds: ["dashboard", "departments", "staff"], status: "active", createdAt: "2026-01-01" },
  { id: "role-finance", name: "Finance", departmentId: "dept-finance", moduleIds: ["dashboard"], status: "active", createdAt: "2026-01-01" },
  { id: "role-svd", name: "Sales Vice Director", departmentId: "dept-sales", moduleIds: ["dashboard"], status: "active", createdAt: "2026-01-01" },
  { id: "role-ssm", name: "Senior Sales Manager", departmentId: "dept-sales", moduleIds: ["dashboard"], status: "active", createdAt: "2026-01-01" },
  { id: "role-sm", name: "Sales Manager", departmentId: "dept-sales", moduleIds: ["dashboard"], status: "active", createdAt: "2026-01-01" },
  { id: "role-ost", name: "OST", departmentId: "dept-sales", moduleIds: ["dashboard"], status: "active", createdAt: "2026-01-01" },
];

const staff: StaffMember[] = [
  { id: "staff-1", displayName: "HR Staff", position: "HR Specialist", departmentId: "dept-hr", departmentRoleId: "role-hr-staff", status: "active", email: "hrstaff@afhomes.local", createdAt: "2026-01-01", avatarUrl: null, accountId: "acct-hr" },
  { id: "staff-2", displayName: "Finance Staff", position: "Finance Analyst", departmentId: "dept-finance", departmentRoleId: "role-fin-staff", status: "active", email: "finstaff@afhomes.local", createdAt: "2026-01-02", avatarUrl: null, accountId: null },
  { id: "staff-3", displayName: "Operations Staff", position: "Operations Coordinator", departmentId: "dept-ops", departmentRoleId: "role-ops-staff", status: "active", email: "opsstaff@afhomes.local", createdAt: "2026-01-03", avatarUrl: null, accountId: null },
  // Linked admin profiles for the My Account page. Position mirrors the role
  // name per the single Roles concept; grants stay within existing delegable modules.
  { id: "staff-admin", displayName: "Admin User", position: "HR Staff", departmentId: "dept-hr", departmentRoleId: "role-hr-staff", status: "active", email: "admin@afhomes.local", createdAt: "2026-01-04", avatarUrl: null, accountId: "acct-admin" },
  { id: "staff-super", displayName: "Super Admin User", position: "HR Staff", departmentId: "dept-hr", departmentRoleId: "role-hr-staff", status: "active", email: "superadmin@afhomes.local", createdAt: "2026-01-04", avatarUrl: null, accountId: "acct-super-admin" },
];

export function createSeedStore(): MockStore {
  return {
    members: members.map((item) => ({ ...item })),
    customers: customers.map((item) => ({ ...item })),
    products: products.map((item) => ({ ...item })),
    accounts: accounts.map((item) => ({ ...item, roleIds: [...item.roleIds] })),
    departments: departments.map((item) => ({ ...item })),
    roles: roles.map((item) => ({ ...item, moduleIds: [...item.moduleIds] })),
    staff: staff.map((item) => ({ ...item })),
    customerSequence: customers.length + 1,
    accountSequence: accounts.length + 1,
    departmentSequence: departments.length + 1,
    roleSequence: roles.length + 1,
    staffSequence: staff.length + 1,
  };
}

export function createMockStore(seed: MockStore = createSeedStore()): MockStore {
  return {
    members: seed.members.map((item) => ({ ...item })),
    customers: seed.customers.map((item) => ({ ...item })),
    products: seed.products.map((item) => ({ ...item })),
    accounts: seed.accounts.map((item) => ({ ...item, roleIds: [...item.roleIds] })),
    departments: seed.departments.map((item) => ({ ...item })),
    roles: seed.roles.map((item) => ({ ...item, moduleIds: [...item.moduleIds] })),
    staff: seed.staff.map((item) => ({ ...item })),
    customerSequence: seed.customerSequence,
    accountSequence: seed.accountSequence,
    departmentSequence: seed.departmentSequence,
    roleSequence: seed.roleSequence,
    staffSequence: seed.staffSequence,
  };
}
