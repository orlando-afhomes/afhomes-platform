import type { DevIdentity } from "@/modules/identity/types";

export const DEV_IDENTITIES: DevIdentity[] = [
  { id: "dev-super-admin", displayName: "Orlando Dela Cruz", roles: ["super_admin"], memberId: null, branchId: null, status: "active", staffId: "staff-super" },
  { id: "dev-admin", displayName: "Eduardo Ocampo · Administrator", roles: ["admin"], memberId: null, branchId: null, status: "active", staffId: "staff-admin" },
  { id: "dev-clerk", displayName: "Marites Gonzales · Clerk", roles: ["clerk"], memberId: null, branchId: null, status: "active", staffId: "staff-clerk" },
  { id: "dev-gsd", displayName: "Joel Fernandez · GSD Counter", roles: ["gsd"], memberId: null, branchId: null, status: "active" },
  { id: "dev-finance", displayName: "Rosalinda Tan · Finance", roles: ["finance"], memberId: null, branchId: null, status: "active" },
  { id: "dev-hr", displayName: "Carmela Rivera · HR", roles: ["hr"], memberId: null, branchId: null, status: "active", staffId: "staff-1" },
  { id: "dev-svd-a", displayName: "Ramon Del Rosario · SVD", roles: ["svd"], memberId: "mem-svd-a", branchId: "branch-a", status: "active" },
  { id: "dev-ssm-a", displayName: "Maria Santos · SSM", roles: ["ssm"], memberId: "mem-ssm-a", branchId: "branch-a", status: "active" },
  { id: "dev-sm-a", displayName: "Jose Reyes Jr. · SM", roles: ["sm"], memberId: "mem-sm-a", branchId: "branch-a", status: "active" },
  { id: "dev-ost-a1", displayName: "Ana Mendoza · OST", roles: ["ost"], memberId: "mem-ost-a1", branchId: "branch-a", status: "active" },
  { id: "dev-ost-a2", displayName: "Mark Villanueva · OST", roles: ["ost"], memberId: "mem-ost-a2", branchId: "branch-a", status: "active" },
  { id: "dev-svd-b", displayName: "Liza Aquino · SVD", roles: ["svd"], memberId: "mem-svd-b", branchId: "branch-b", status: "active" },
  { id: "dev-ost-b1", displayName: "Paolo Ramos · OST", roles: ["ost"], memberId: "mem-ost-b1", branchId: "branch-b", status: "active" },
  { id: "dev-svd-c", displayName: "Teresita Navarro · SVD", roles: ["svd"], memberId: "mem-svd-c", branchId: "branch-c", status: "active" },
  { id: "dev-ost-c1", displayName: "Rowena Castillo · OST", roles: ["ost"], memberId: "mem-ost-c1", branchId: "branch-c", status: "active" },
  { id: "dev-inactive", displayName: "Ana Mendoza · OST (inactive login)", roles: ["ost"], memberId: "mem-ost-a1", branchId: "branch-a", status: "inactive" },
  {
    id: "dev-multi-role",
    displayName: "Jose Reyes Jr. · SM and OST",
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

export { activeRoles } from "@/modules/identity/active-roles";
