"use client";

import { usePathname } from "next/navigation";
import { useDevIdentity } from "@/shared/providers/dev-identity-provider";
import { PageContainer } from "@/shared/components/modern/page-container";
import { PageHeader } from "@/shared/components/modern/page-header";
import { Breadcrumbs } from "@/shared/components/modern/breadcrumbs";
import { InfoNote } from "@/shared/components/modern/detail-list";
import { getRoleAwareAdminBreadcrumbs } from "@/panels/admin/navigation";
import { getEffectiveRoles } from "@/modules/identity/permissions";
import { getRoleDisplayLabel } from "../role-label";
import { AdminDashboard } from "../dashboard/admin-dashboard";
import { FinanceDashboard } from "../dashboard/finance-dashboard";
import { SalesDashboard } from "../dashboard/sales-dashboard";
import { resolveDashboard } from "../dashboard/resolve-dashboard";

/** Dashboard home: picks the Admin, Finance, or Sales layout. The layout grants nothing by itself. */
export function AdminDashboardPage() {
  const pathname = usePathname();
  const { identity } = useDevIdentity();
  const kind = resolveDashboard(identity);
  const roles = getEffectiveRoles(identity);

  return (
    <PageContainer>
      <Breadcrumbs items={getRoleAwareAdminBreadcrumbs(identity, pathname ?? "/admin")} />
      {kind === "restricted" ? (
        <PageHeader title="Access restricted" description="This account does not have access to administration functions." />
      ) : kind === "admin" ? (
        <AdminDashboard roles={roles} />
      ) : kind === "finance" ? (
        <FinanceDashboard />
      ) : kind === "sales" ? (
        <SalesDashboard identity={identity} />
      ) : (
        <>
          <PageHeader
            title={`Welcome back, ${getRoleDisplayLabel(roles)}`}
            description="Your authorized administration modules are available in the navigation."
          />
          <div className="tw:mt-5">
            <InfoNote title="No dashboard metrics">
              No operational dashboard metrics are available for this role. Authorized modules remain available in the navigation.
            </InfoNote>
          </div>
        </>
      )}
    </PageContainer>
  );
}
