"use client";

import { useCommissions } from "@/data/business-queries";
import { Money } from "@/shared/components/modern/money";
import { Section } from "@/shared/components/modern/section";
import { StatTiles } from "@/shared/components/modern/stat-tiles";
import { ReportShell, useReportRange } from "../components/report-shell";

export function CommissionReportPage() {
  const range = useReportRange();
  const commissions = useCommissions();
  const commissionList = commissions.data ?? [];
  const approvedInPeriod = commissionList.filter((item) => range.inRange(item.approvedAt)).reduce((sum, item) => sum + item.amountCentavos, 0);
  const paidInPeriod = commissionList.filter((item) => range.inRange(item.payout?.confirmedAt)).reduce((sum, item) => sum + item.amountCentavos, 0);
  return (
    <ReportShell range={range} title="Commission Report" description="Role-scoped figures built from the source records." crumbs={[{ label: "Reports" }, { label: "Commission Report" }]}>
      <Section title="Commission obligations" description="Approved is not Paid. Approvals use the approval date; payouts use the confirmed disbursement date.">
        <StatTiles items={[{ label: "Approved in period", value: <Money value={approvedInPeriod} /> }, { label: "Paid in period", value: <Money value={paidInPeriod} /> }, { label: "Approved, unpaid", value: <Money value={commissionList.filter((item) => item.status === "approved").reduce((sum, item) => sum + item.amountCentavos, 0)} /> }, { label: "On hold", value: <Money value={commissionList.filter((item) => item.status === "on_hold").reduce((sum, item) => sum + item.amountCentavos, 0)} /> }]} />
      </Section>
    </ReportShell>
  );
}
