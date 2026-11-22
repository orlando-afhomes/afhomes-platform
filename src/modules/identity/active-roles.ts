import type { DevIdentity } from "./types";

export function activeRoles(identity: DevIdentity) {
  if (identity.status !== "active") return [];
  if (!identity.roleAssignments) return [...identity.roles];
  const active = identity.roleAssignments.filter((assignment) => assignment.status === "active").map((assignment) => assignment.role);
  return identity.roles.filter((role) => active.includes(role));
}
