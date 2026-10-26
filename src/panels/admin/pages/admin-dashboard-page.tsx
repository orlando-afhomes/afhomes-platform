"use client";

import { usePathname } from "next/navigation";
import { useDevIdentity } from "@/shared/providers/dev-identity-provider";
import { useMembers, useCustomers } from "@/data/queries";
import { PageContainer } from "@/shared/components/layout/page-container";
import { PageHeader } from "@/shared/components/layout/page-header";
import { Breadcrumbs } from "@/shared/components/layout/breadcrumbs";
import { getRoleAwareAdminBreadcrumbs } from "@/panels/admin/navigation";
import { getEffectiveRoles, isModuleGranted } from "@/modules/identity/permissions";
import { countVisibleCustomers, countVisibleMembers } from "../dashboard-metrics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SalesNetworkPanel } from "../components/sales-network-panel";

function isSalesRole(roles: string[]) {
  return roles.some((role) => ["svd", "ssm", "sm", "ist", "ost"].includes(role));
}

function getPanelTitle(roles: string[], active: boolean): string {
  if (!active) return "Access restricted";
  if (roles.includes("super_admin")) return "Super Administrator";
  if (roles.includes("admin")) return "Administrator";
  if (roles.includes("hr")) return "Human Resources";
  if (roles.includes("finance")) return "Finance";
  if (roles.includes("svd")) return "Senior Vice Director";
  if (roles.includes("ssm")) return "Senior Sales Manager";
  if (roles.includes("sm")) return "Sales Manager";
  if (roles.includes("ist")) return "Internal Sales";
  if (roles.includes("ost")) return "Outside Sales";
  if (roles.length === 0) return "Staff";
  return "Administration";
}

function getPanelDescription(active: boolean): string {
  if (!active) {
    return "This account does not have access to administration functions.";
  }
  return "Authorized modules are available in the navigation.";
}

export function AdminDashboardPage() {
  const pathname = usePathname();
  const { identity } = useDevIdentity();
  const active = identity.status === "active";
  const roles = getEffectiveRoles(identity);
  const membersQuery = useMembers();
  const customersQuery = useCustomers();

  if (active && isSalesRole(roles)) {
    return (
      <PageContainer>
        <SalesNetworkPanel />
      </PageContainer>
    );
  }

  const title = getPanelTitle(roles, active);
  const description = getPanelDescription(active);

  return (
    <PageContainer>
      <div className="space-y-4">
        <Breadcrumbs items={getRoleAwareAdminBreadcrumbs(identity, pathname ?? "/admin")} />
        <PageHeader title={title} description={description} />
        {active ? (
          <div className="grid gap-4 md:grid-cols-2">
            {isModuleGranted(identity, "sales-network") ? (
              <Card>
                <CardHeader>
                  <CardTitle>Visible team members</CardTitle>
                </CardHeader>
                <CardContent>
                  {membersQuery.isLoading ? (
                    <Skeleton className="h-8 w-20" />
                  ) : (
                    <p className="text-2xl font-semibold">{countVisibleMembers(membersQuery.data ?? [])}</p>
                  )}
                </CardContent>
              </Card>
            ) : null}
            {isModuleGranted(identity, "customers") ? (
              <Card>
                <CardHeader>
                  <CardTitle>Visible customers</CardTitle>
                </CardHeader>
                <CardContent>
                  {customersQuery.isLoading ? (
                    <Skeleton className="h-8 w-20" />
                  ) : (
                    <p className="text-2xl font-semibold">{countVisibleCustomers(customersQuery.data ?? [])}</p>
                  )}
                </CardContent>
              </Card>
            ) : null}
          </div>
        ) : null}
      </div>
    </PageContainer>
  );
}
