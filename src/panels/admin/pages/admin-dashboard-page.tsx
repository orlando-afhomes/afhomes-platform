"use client";

import { usePathname } from "next/navigation";
import { useDevIdentity } from "@/shared/providers/dev-identity-provider";
import { useMembers, useCustomers } from "@/data/queries";
import { PageContainer } from "@/shared/components/modern/page-container";
import { PageHeader } from "@/shared/components/modern/page-header";
import { Breadcrumbs } from "@/shared/components/modern/breadcrumbs";
import { Skeleton } from "@/shared/ui/skeleton";
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
      <Breadcrumbs items={getRoleAwareAdminBreadcrumbs(identity, pathname ?? "/admin")} />
      <PageHeader title={title} description={description} />
      {active ? (
        <div className="tw:mt-4 tw:grid tw:gap-4 tw:md:grid-cols-2">
          {isModuleGranted(identity, "sales-network") ? (
            <StatCard title="Visible team members" loading={membersQuery.isLoading} value={countVisibleMembers(membersQuery.data ?? [])} />
          ) : null}
          {isModuleGranted(identity, "customers") ? (
            <StatCard title="Visible customers" loading={customersQuery.isLoading} value={countVisibleCustomers(customersQuery.data ?? [])} />
          ) : null}
        </div>
      ) : null}
    </PageContainer>
  );
}

function StatCard({ title, value, loading }: { title: string; value: number; loading: boolean }) {
  return (
    <section aria-label={title} className="tw:rounded-lg tw:border tw:border-border tw:bg-card tw:p-4">
      <h2 className="tw:text-sm tw:font-medium tw:text-muted-foreground">{title}</h2>
      {loading ? (
        <Skeleton className="tw:mt-2 tw:h-8 tw:w-16" />
      ) : (
        <p className="tw:mt-1 tw:text-3xl tw:font-semibold">{value.toLocaleString()}</p>
      )}
    </section>
  );
}
