"use client";

import { useMemo, useState } from "react";
import { useMemberships, useVipProducts } from "@/data/business-queries";
import type { MembershipView } from "@/data/contracts/membership-repository";
import { FilterBar } from "@/shared/components/modern/filter-bar";
import { formatDate } from "@/shared/lib/format-date";
import { humanize } from "@/shared/lib/humanize";
import { matchesSearch, optionsFrom } from "@/shared/lib/search";
import { AdminStatGrid, AdminStatCard, AdminSection } from "@/shared/components/admin";
import { Medal, UserCheck } from "lucide-react";
import { ReportShell, ReportTable, useReportRange, type ReportColumn } from "../components/report-shell";

const COLUMNS: ReportColumn<MembershipView>[] = [
  { header: "Customer", value: (item) => item.customerName },
  { header: "Tier", value: (item) => item.productCode },
  { header: "Scheme", value: (item) => item.schemeLabel },
  { header: "VIP Number", value: (item) => item.cardId ?? "" },
  { header: "Status", value: (item) => humanize(item.status) },
  { header: "Activated", value: (item) => formatDate(item.activationDate) },
  { header: "Valid until", value: (item) => formatDate(item.validityEndDate) },
];

export function MembershipReportPage() {
  const range = useReportRange();
  const memberships = useMemberships();
  const membershipList = useMemo(() => memberships.data ?? [], [memberships.data]);
  const activatedInPeriod = membershipList.filter((item) => range.inRange(item.activationDate)).length;
  const products = useVipProducts();
  const tierCodes = (products.data ?? []).map((product) => product.code);
  const inPeriod = useMemo(() => membershipList.filter((item) => range.inRange(item.activationDate) || range.inRange(item.createdAt)), [membershipList, range]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [tier, setTier] = useState("all");
  const rows = useMemo(() => inPeriod.filter((item) => (status === "all" || item.status === status) && (tier === "all" || item.productCode === tier) && matchesSearch(search, item.customerName, item.cardId)), [inPeriod, status, tier, search]);
  const byTier = tierCodes.map((code) => ({ code, count: membershipList.filter((item) => item.productCode === code && item.status === "active").length }));
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
      <ReportTable report="Membership Report" fileName="memberships" range={range} columns={COLUMNS} rows={rows} getRowId={(row) => row.id} loading={memberships.isLoading} error={memberships.error} emptyText="No memberships match."
        filters={<FilterBar search={search} onSearch={setSearch} searchLabel="Search memberships" filters={[
          { label: "Membership status filter", value: status, onChange: setStatus, options: optionsFrom("All statuses", inPeriod.map((item) => item.status), humanize) },
          { label: "VIP tier filter", value: tier, onChange: setTier, options: optionsFrom("All tiers", tierCodes) },
        ]} />} />
    </ReportShell>
  );
}
