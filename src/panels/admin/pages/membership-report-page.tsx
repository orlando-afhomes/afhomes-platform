"use client";

import { useMemberships } from "@/data/business-queries";
import { AdminStatGrid, AdminStatCard, AdminSection } from "@/shared/components/admin";
import { Medal, UserCheck } from "lucide-react";
import { ReportShell, useReportRange } from "../components/report-shell";

export function MembershipReportPage() {
  const range = useReportRange();
  const memberships = useMemberships();
  const membershipList = memberships.data ?? [];
  const activatedInPeriod = membershipList.filter((item) => range.inRange(item.activationDate)).length;
  const byTier = ["B1", "S1", "G1"].map((code) => ({ code, count: membershipList.filter((item) => item.productCode === code && item.status === "active").length }));
  return (
    <ReportShell range={range} title="Membership Report" description="Role-scoped figures built from the source records." crumbs={[{ label: "Reports" }, { label: "Membership Report" }]}>
      <AdminSection title="Membership distribution" description="Memberships count from official activation.">
        <AdminStatGrid>
          <AdminStatCard loading={memberships.isLoading} error={memberships.error} label="Activated" value={activatedInPeriod} icon={UserCheck} tone="success" />
          {byTier.map((tier) => (
            <AdminStatCard loading={memberships.isLoading} error={memberships.error} key={tier.code} label={`Active ${tier.code}`} value={tier.count} icon={Medal} tone="info" />
          ))}
        </AdminStatGrid>
      </AdminSection>
    </ReportShell>
  );
}
