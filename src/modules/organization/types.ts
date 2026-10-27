export type Designation = "SVD" | "SSM" | "SM" | "OST";

export type MemberStatus = "active" | "inactive" | "suspended";

export type OrgMember = {
  id: string;
  displayName: string;
  designation: Designation;
  branchId: string;
  parentId: string | null;
  status: MemberStatus;
  departmentId?: string | null;
};

export type DepartmentStatus = "active" | "deactivated";

export type Department = {
  id: string;
  name: string;
  code: string;
  description: string;
  headStaffId: string | null;
  status: DepartmentStatus;
};

export type DepartmentRoleStatus = "active" | "deactivated";

export type DepartmentRole = {
  id: string;
  name: string;
  departmentId: string;
  moduleIds: string[];
  status: DepartmentRoleStatus;
  createdAt: string;
};

export type StaffStatus = "active" | "inactive" | "suspended";

export type StaffMember = {
  id: string;
  displayName: string;
  position: string;
  departmentId: string | null;
  /** Primary department role under the Department → Roles → Staff model. */
  departmentRoleId: string | null;
  status: StaffStatus;
  email: string;
  createdAt: string;
  avatarUrl: string | null;
  accountId: string | null;
};
