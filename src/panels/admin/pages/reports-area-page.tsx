"use client";

import { AreaPage, type AreaPageTab } from "@/shared/components/admin";
import { ADMIN_AREA_TABS, type AdminAreaTabValue } from "../navigation";
import { useAdminAreaTabAccess } from "../use-role-aware-navigation";
import { ReportsSummaryPanel, type ReportKey } from "../components/reports-summary-panel";
import { ReportRangeProvider } from "../components/report-shell";
import { CollectionsReportPanel } from "./collections-report-page";
import { CommissionReportPanel } from "./commission-report-page";
import { CustomerGrowthReportPanel } from "./customer-growth-report-page";
import { MembershipReportPanel } from "./membership-report-page";
import { PromoPointsReportPanel } from "./promo-points-report-page";
import { SalesReportPanel } from "./sales-performance-report-page";
import { StayPointsReportPanel } from "./stay-points-report-page";

type ReportsTab = AdminAreaTabValue<"reports">;

const PANELS: Record<ReportKey, () => React.ReactNode> = {
  sales: () => <SalesReportPanel />,
  customers: () => <CustomerGrowthReportPanel />,
  collections: () => <CollectionsReportPanel />,
  commissions: () => <CommissionReportPanel />,
  membership: () => <MembershipReportPanel />,
  "stay-points": () => <StayPointsReportPanel />,
  "promo-points": () => <PromoPointsReportPanel />,
};

/** Reports area at /admin/reports: a Summary tab that drills down into one tab per report. Tabs follow the sidebar rules. The range provider keeps one date range across every tab. */
export function ReportsAreaPage() {
  const access = useAdminAreaTabAccess("reports");
  const tabs: AreaPageTab[] = ADMIN_AREA_TABS.reports.map(({ value, label }) => ({
    value,
    label,
    allowed: access[value as ReportsTab],
    render: value === "summary" ? (select) => <ReportsSummaryPanel onOpen={select} /> : PANELS[value as ReportKey],
  }));
  return (
    <ReportRangeProvider>
      <AreaPage anyOf={["reports"]} title="Reports" tabs={tabs} />
    </ReportRangeProvider>
  );
}
