export type Designation = "SVD" | "SSM" | "SM" | "OST" | "IST";

export type MemberStatus = "active" | "inactive" | "suspended";

export type OrgMember = {
  id: string;
  displayName: string;
  designation: Designation;
  branchId: string;
  parentId: string | null;
  status: MemberStatus;
};
