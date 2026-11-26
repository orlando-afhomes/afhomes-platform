"use client";

import { usePathname } from "next/navigation";
import { useDevIdentity } from "@/shared/providers/identity-provider";
import { PageContainer } from "@/shared/components/modern/page-container";
import { PageHeader } from "@/shared/components/modern/page-header";
import { Breadcrumbs } from "@/shared/components/modern/breadcrumbs";
import { InfoNote } from "@/shared/components/modern/detail-list";
import { getRoleAwareAdminBreadcrumbs } from "@/panels/admin/navigation";
import { getEffectiveRoles } from "@/modules/identity/permissions";
import { getRoleDisplayLabel } from "../role-label";
import { AdminDashboard } from "../dashboard/admin-dashboard";
import { ClerkDashboard } from "../dashboard/clerk-dashboard";
import { FinanceDashboard } from "../dashboard/finance-dashboard";
import { GsdDashboard } from "../dashboard/gsd-dashboard";
import { HrDashboard } from "../dashboard/hr-dashboard";
import { SalesDashboard } from "../dashboard/sales-dashboard";
import { resolveDashboard } from "../dashboard/resolve-dashboard";

/** Dashboard home: picks the Admin, Finance, Sales, Clerk, GSD, or HR layout. The layout grants nothing by itself. */
export function AdminDashboardPage() {
  const pathname = usePathname();
  const { identity } = useDevIdentity();
  const kind = resolveDashboard(identity);
  const roles = getEffectiveRoles(identity);

  return (
    <PageContainer className="tw:max-w-[88rem] tw:lg:px-8">
      <Breadcrumbs items={getRoleAwareAdminBreadcrumbs(identity, pathname ?? "/admin")} />
      {kind === "restricted" ? (
        <PageHeader title="Access Restricted" description="This account does not have access to administration functions." />
      ) : kind === "admin" ? (
        <AdminDashboard roles={roles} />
      ) : kind === "finance" ? (
        <FinanceDashboard />
      ) : kind === "sales" ? (
        <SalesDashboard identity={identity} />
      ) : kind === "clerk" ? (
        <ClerkDashboard />
      ) : kind === "gsd" ? (
        <GsdDashboard />
      ) : kind === "hr" ? (
        <HrDashboard />
      ) : (
        <>
          <PageHeader
            title={`Welcome Back, ${getRoleDisplayLabel(roles)}`}
            description="Your authorized administration modules are available in the navigation."
          />
          <div className="tw:mt-5">
            <InfoNote title="No Dashboard Metrics">
              No operational dashboard metrics are available for this role. Authorized modules remain available in the navigation.
            </InfoNote>
          </div>
        </>
      )}
    </PageContainer>
  );
}
