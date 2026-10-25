import type { DevIdentity } from "@/modules/identity/types";

export const DEV_IDENTITIES: DevIdentity[] = [
  { id: "dev-super-admin", displayName: "Super Admin (Dev)", roles: ["super_admin"], memberId: null, branchId: null, status: "active" },
  { id: "dev-admin", displayName: "Administrator (Dev)", roles: ["admin"], memberId: null, branchId: null, status: "active" },
  { id: "dev-finance", displayName: "Finance (Dev)", roles: ["finance"], memberId: null, branchId: null, status: "active" },
  { id: "dev-hr", displayName: "HR (Dev)", roles: ["hr"], memberId: null, branchId: null, status: "active" },
  { id: "dev-svd-a", displayName: "SVD Alpha (Dev)", roles: ["svd"], memberId: "mem-svd-a", branchId: "branch-a", status: "active" },
  { id: "dev-ssm-a", displayName: "SSM Alpha (Dev)", roles: ["ssm"], memberId: "mem-ssm-a", branchId: "branch-a", status: "active" },
  { id: "dev-sm-a", displayName: "SM Alpha (Dev)", roles: ["sm"], memberId: "mem-sm-a", branchId: "branch-a", status: "active" },
  { id: "dev-ost-a1", displayName: "OST Alpha One (Dev)", roles: ["ost"], memberId: "mem-ost-a1", branchId: "branch-a", status: "active" },
  { id: "dev-ost-a2", displayName: "OST Alpha Two (Dev)", roles: ["ost"], memberId: "mem-ost-a2", branchId: "branch-a", status: "active" },
  { id: "dev-ist-a", displayName: "IST Alpha (Dev)", roles: ["ist"], memberId: "mem-ist-a", branchId: "branch-a", status: "active" },
  { id: "dev-svd-b", displayName: "SVD Beta (Dev)", roles: ["svd"], memberId: "mem-svd-b", branchId: "branch-b", status: "active" },
  { id: "dev-ost-b1", displayName: "OST Beta One (Dev)", roles: ["ost"], memberId: "mem-ost-b1", branchId: "branch-b", status: "active" },
  { id: "dev-inactive", displayName: "Inactive OST (Dev)", roles: ["ost"], memberId: "mem-ost-a1", branchId: "branch-a", status: "inactive" },
  {
    id: "dev-multi-role",
    displayName: "Multi-Role SM/OST (Dev)",
    roles: ["sm", "ost"],
    memberId: "mem-sm-a",
    branchId: "branch-a",
    status: "active",
    roleAssignments: [
      { role: "sm", status: "active" },
      { role: "ost", status: "active" },
      { role: "admin", status: "inactive" },
    ],
  },
];

export function getDevIdentity(id: string) {
  return DEV_IDENTITIES.find((identity) => identity.id === id) ?? DEV_IDENTITIES[0];
}

export function activeRoles(identity: DevIdentity) {
  if (identity.status !== "active") return [];
  if (!identity.roleAssignments) return [...identity.roles];
  const active = identity.roleAssignments.filter((assignment) => assignment.status === "active").map((assignment) => assignment.role);
  return identity.roles.filter((role) => active.includes(role));
}
