/** Clean display name for a single system role id (never the raw id). */
export function getSystemRoleLabel(role: string): string {
  switch (role) {
    case "super_admin":
      return "Super Admin";
    case "admin":
      return "Administrator";
    case "hr":
      return "Human Resources";
    case "finance":
      return "Finance";
    case "svd":
      return "Sales Vice Director";
    case "ssm":
      return "Senior Sales Manager";
    case "sm":
      return "Sales Manager";
    case "ost":
      return "OST";
    default:
      return role;
  }
}

/** Display label for an identity's primary role (first match wins). */
export function getRoleDisplayLabel(roles: string[]): string {
  if (roles.includes("super_admin")) return getSystemRoleLabel("super_admin");
  if (roles.includes("admin")) return getSystemRoleLabel("admin");
  if (roles.includes("hr")) return getSystemRoleLabel("hr");
  if (roles.includes("finance")) return getSystemRoleLabel("finance");
  if (roles.includes("svd")) return getSystemRoleLabel("svd");
  if (roles.includes("ssm")) return getSystemRoleLabel("ssm");
  if (roles.includes("sm")) return getSystemRoleLabel("sm");
  if (roles.includes("ost")) return getSystemRoleLabel("ost");
  if (roles.length === 0) return "Staff";
  return "Administration";
}
