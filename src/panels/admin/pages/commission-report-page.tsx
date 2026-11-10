"use client";

import { useCommissions } from "@/data/business-queries";
import { Money } from "@/shared/components/modern/money";
import { AdminStatGrid, AdminStatCard, AdminSection } from "@/shared/components/admin";
import { BadgeCheck, Banknote, Clock, Hourglass } from "lucide-react";
import { ReportShell, useReportRange } from "../components/report-shell";

export function CommissionReportPage() {
  const range = useReportRange();
  const commissions = useCommissions();
  const commissionList = commissions.data ?? [];
  const approvedInPeriod = commissionList.filter((item) => range.inRange(item.approvedAt)).reduce((sum, item) => sum + item.amountCentavos, 0);
  const paidInPeriod = commissionList.filter((item) => range.inRange(item.payout?.confirmedAt)).reduce((sum, item) => sum + item.amountCentavos, 0);
  return (
    <ReportShell range={range} title="Commission Report" description="Role-scoped figures built from the source records." crumbs={[{ label: "Reports" }, { label: "Commission Report" }]}>
      <AdminSection title="Commission obligations" description="Approved is not Paid. Approvals use the approval date; payouts use the confirmed disbursement date.">
        <AdminStatGrid>
          <AdminStatCard label="Approved in period" value={<Money value={approvedInPeriod} />} icon={BadgeCheck} tone="brand" />
          <AdminStatCard label="Paid in period" value={<Money value={paidInPeriod} />} icon={Banknote} tone="success" />
          <AdminStatCard label="Approved, unpaid" value={<Money value={commissionList.filter((item) => item.status === "approved").reduce((sum, item) => sum + item.amountCentavos, 0)} />} icon={Clock} tone="accent" />
          <AdminStatCard label="On hold" value={<Money value={commissionList.filter((item) => item.status === "on_hold").reduce((sum, item) => sum + item.amountCentavos, 0)} />} icon={Hourglass} tone="warning" />
        </AdminStatGrid>
      </AdminSection>
    </ReportShell>
  );
}
