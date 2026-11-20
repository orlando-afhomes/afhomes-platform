"use client";

import type { ReactNode } from "react";
import { useEffectiveModuleIds } from "@/data/queries";
import type { AdminModuleId } from "@/modules/identity/permissions";
import { Breadcrumbs, type BreadcrumbItem } from "@/shared/components/modern/breadcrumbs";
import { DashboardHeader } from "@/shared/components/dashboard/dashboard-layout";
import { PageContainer } from "@/shared/components/modern/page-container";
import { StatusLink, StatusPage } from "@/shared/components/status/status-page";

/** Section landmarks every list page may link back to, so breadcrumbs never dead-end on a bare label. */
const SECTION_HREFS: Record<string, string> = {
  Dashboard: "/admin",
  Customers: "/admin/customers",
  Sales: "/admin/sales",
  Money: "/admin/finance",
  Finance: "/admin/finance",
  Commissions: "/admin/commissions",
  "Member Services": "/admin/membership",
  Membership: "/admin/membership",
  "Stay Points": "/admin/stay-points",
  Promos: "/admin/promos",
  Redemption: "/admin/redemption",
  Management: "/admin/organization",
  Organization: "/admin/organization",
  Settings: "/admin/vip-products",
  "Sales Network": "/admin/sales-network",
  "Reports and Audit": "/admin/reports",
  Reports: "/admin/reports",
  "Audit Logs": "/admin/audit-logs",
};

const withSectionHrefs = (items: BreadcrumbItem[]): BreadcrumbItem[] =>
  items.map((item) => (item.href ? item : { ...item, href: SECTION_HREFS[item.label] }));

/**
 * Standard admin page shell: module gate, breadcrumbs, dashboard-scale
 * heading with the actions on the same line, and content column.
 * Presentation only; access and record scope stay with the repositories.
 * For an area with tabs use `AreaPage`.
 */
export function AdminPage({
  anyOf,
  title,
  description,
  crumbs,
  actions,
  allowed = true,
  embedded = false,
  children,
}: {
  anyOf: readonly AdminModuleId[];
  title: string;
  /** One short sentence at most; prefer none (owner ruling 2026-11-15: less text). */
  description?: string;
  crumbs: BreadcrumbItem[];
  actions?: ReactNode;
  allowed?: boolean;
  embedded?: boolean;
  children: ReactNode;
}) {
  const granted = useEffectiveModuleIds();
  if (!allowed || !anyOf.some((moduleId) => granted.has(moduleId))) {
    return (
      <PageContainer>
        <Breadcrumbs items={withSectionHrefs([{ label: "Dashboard", href: "/admin" }, ...crumbs])} />
        <StatusPage variant="403" embedded description={`This account does not have access to ${title}.`}>
          <StatusLink href="/admin" primary>
            Back to dashboard
          </StatusLink>
        </StatusPage>
      </PageContainer>
    );
  }
  if (embedded) {
    return <>{actions ? <div className="tw:flex tw:flex-wrap tw:items-center tw:gap-2">{actions}</div> : null}{children}</>;
  }
  return (
    <PageContainer>
      <Breadcrumbs items={withSectionHrefs([{ label: "Dashboard", href: "/admin" }, ...crumbs])} />
      <DashboardHeader title={title} description={description} actions={actions} />
      <div className="tw:mt-6 tw:flex tw:flex-col tw:gap-6">{children}</div>
    </PageContainer>
  );
}
