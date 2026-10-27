"use client";

import { usePathname } from "next/navigation";
import { Card, Skeleton, Statistic } from "antd";
import { useDevIdentity } from "@/shared/providers/dev-identity-provider";
import { useMembers, useCustomers } from "@/data/queries";
import { PageContainer } from "@/shared/components/layout/page-container";
import { PageHeader } from "@/shared/components/layout/page-header";
import { Breadcrumbs } from "@/shared/components/layout/breadcrumbs";
import { getRoleAwareAdminBreadcrumbs } from "@/panels/admin/navigation";
import { getEffectiveRoles, isModuleGranted } from "@/modules/identity/permissions";
import { countVisibleCustomers, countVisibleMembers } from "../dashboard-metrics";
import { getRoleDisplayLabel } from "../role-label";
import { SalesNetworkPanel } from "../components/sales-network-panel";

function isSalesRole(roles: string[]) {
  return roles.some((role) => ["svd", "ssm", "sm", "ost"].includes(role));
}

function getPanelTitle(roles: string[], active: boolean): string {
  if (!active) return "Access restricted";
  return getRoleDisplayLabel(roles);
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
      <div className="dashboard-page">
        <Breadcrumbs items={getRoleAwareAdminBreadcrumbs(identity, pathname ?? "/admin")} />
        <PageHeader title={title} description={description} />
        {active ? (
          <div className="dashboard-page__stats-grid">
            {isModuleGranted(identity, "sales-network") ? (
              <Card>
                {membersQuery.isLoading ? (
                  <Skeleton active paragraph={{ rows: 1 }} />
                ) : (
                  <Statistic title="Visible team members" value={countVisibleMembers(membersQuery.data ?? [])} />
                )}
              </Card>
            ) : null}
            {isModuleGranted(identity, "customers") ? (
              <Card>
                {customersQuery.isLoading ? (
                  <Skeleton active paragraph={{ rows: 1 }} />
                ) : (
                  <Statistic title="Visible customers" value={countVisibleCustomers(customersQuery.data ?? [])} />
                )}
              </Card>
            ) : null}
          </div>
        ) : null}
      </div>
    </PageContainer>
  );
}
