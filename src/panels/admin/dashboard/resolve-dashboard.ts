import { getEffectiveRoles } from "@/modules/identity/permissions";
import type { DevIdentity } from "@/modules/identity/types";

export type DashboardKind = "restricted" | "admin" | "finance" | "sales" | "none";

const SALES_ROLES = ["svd", "ssm", "sm", "ost"];

/**
 * Picks which dashboard layout to show. It grants nothing: every widget is
 * still gated by module and operation grants, and every record list is scoped
 * by the repositories. Roles combine as a union, so a layout is chosen by
 * fixed precedence (administration, then Finance, then sales) and no switcher exists.
 */
export function resolveDashboard(identity: DevIdentity): DashboardKind {
  if (identity.status !== "active") return "restricted";
  const roles = getEffectiveRoles(identity);
  if (roles.includes("super_admin") || roles.includes("admin")) return "admin";
  if (roles.includes("finance")) return "finance";
  if (roles.some((role) => SALES_ROLES.includes(role))) return "sales";
  return "none";
}

/** The sales role shown in the Sales dashboard heading, highest designation first. */
export function primarySalesRole(identity: DevIdentity): string | null {
  const roles: readonly string[] = getEffectiveRoles(identity);
  return SALES_ROLES.find((role) => roles.includes(role)) ?? null;
}
