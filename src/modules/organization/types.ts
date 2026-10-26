export type Designation = "SVD" | "SSM" | "SM" | "OST" | "IST";

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

export type DepartmentStatus = "active" | "archived";

export type Department = {
  id: string;
  name: string;
  code: string;
  description: string;
  headStaffId: string | null;
  status: DepartmentStatus;
};

export type StaffStatus = "active" | "inactive" | "suspended";

export type StaffMember = {
  id: string;
  displayName: string;
  position: string;
  departmentId: string | null;
  status: StaffStatus;
  email: string;
  createdAt: string;
};
