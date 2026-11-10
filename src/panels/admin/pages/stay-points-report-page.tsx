"use client";

import { useStayPoints } from "@/data/business-queries";
import { AdminStatGrid, AdminStatCard, AdminSection } from "@/shared/components/admin";
import { Clock, Hourglass, TrendingUp, Wallet } from "lucide-react";
import { ReportShell, useReportRange } from "../components/report-shell";

export function StayPointsReportPage() {
  const range = useReportRange();
  const points = useStayPoints();
  const pointsList = points.data ?? [];
  const earned = pointsList.flatMap((item) => item.ledger.entries).filter((item) => range.inRange(item.date) && (item.status === "spendable" || item.status === "pending" || item.status === "held")).reduce((sum, item) => sum + item.earnedWeekday + item.earnedWeekend, 0);
  return (
    <ReportShell range={range} title="Stay Points Report" description="Role-scoped figures built from the source records." crumbs={[{ label: "Reports" }, { label: "Stay Points Report" }]}>
      <AdminSection title="Stay points" description="Points use the verified earning date. Redemption reporting is not available while Redemption is disabled.">
        <AdminStatGrid>
          <AdminStatCard label="Points earned in period" value={earned.toLocaleString("en-PH")} icon={TrendingUp} tone="success" />
          <AdminStatCard label="Spendable (all)" value={pointsList.reduce((sum, item) => sum + item.ledger.balances.spendableWeekday + item.ledger.balances.spendableWeekend, 0).toLocaleString("en-PH")} icon={Wallet} tone="success" />
          <AdminStatCard label="Pending (all)" value={pointsList.reduce((sum, item) => sum + item.ledger.balances.pending, 0).toLocaleString("en-PH")} icon={Clock} tone="warning" />
          <AdminStatCard label="Held (all)" value={pointsList.reduce((sum, item) => sum + item.ledger.balances.held, 0).toLocaleString("en-PH")} icon={Hourglass} tone="warning" />
        </AdminStatGrid>
      </AdminSection>
    </ReportShell>
  );
}
