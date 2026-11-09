"use client";

import { useMemberships } from "@/data/business-queries";
import { Section } from "@/shared/components/modern/section";
import { StatTiles } from "@/shared/components/modern/stat-tiles";
import { ReportShell, useReportRange } from "../components/report-shell";

export function MembershipReportPage() {
  const range = useReportRange();
  const memberships = useMemberships();
  const membershipList = memberships.data ?? [];
  const activatedInPeriod = membershipList.filter((item) => range.inRange(item.activationDate)).length;
  const byTier = ["B1", "S1", "G1"].map((code) => ({ code, count: membershipList.filter((item) => item.productCode === code && item.status === "active").length }));
  return (
    <ReportShell range={range} title="Membership Report" description="Role-scoped figures built from the source records." crumbs={[{ label: "Reports" }, { label: "Membership Report" }]}>
      <Section title="Membership distribution" description="Memberships count from official activation.">
        <StatTiles items={[{ label: "Activated in period", value: activatedInPeriod }, ...byTier.map((tier) => ({ label: `Active ${tier.code}`, value: tier.count }))]} />
      </Section>
    </ReportShell>
  );
}
