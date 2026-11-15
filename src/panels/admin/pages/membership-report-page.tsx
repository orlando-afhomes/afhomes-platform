"use client";

import { useMemo, useState } from "react";
import { useMemberships, useVipProducts } from "@/data/business-queries";
import type { MembershipView } from "@/data/contracts/membership-repository";
import { FilterBar } from "@/shared/components/modern/filter-bar";
import { formatDate } from "@/shared/lib/format-date";
import { humanize } from "@/shared/lib/humanize";
import { matchesSearch, optionsFrom } from "@/shared/lib/search";
import { AdminPage, AdminStatGrid, AdminStatCard } from "@/shared/components/admin";
import { Clock, Medal, UserCheck } from "lucide-react";
import { ReportFrame, ReportTable, useReportRange, type ReportColumn } from "../components/report-shell";

const COLUMNS: ReportColumn<MembershipView>[] = [
  { header: "Customer", value: (item) => item.customerName },
  { header: "Tier", value: (item) => item.productCode },
  { header: "Scheme", value: (item) => item.schemeLabel, screen: false },
  { header: "VIP Number", value: (item) => item.cardId ?? "" },
  { header: "Status", value: (item) => humanize(item.status) },
  { header: "Activated", value: (item) => formatDate(item.activationDate) },
  { header: "Valid until", value: (item) => formatDate(item.validityEndDate), screen: false },
];

/** Membership figures. Memberships count from official activation (doc 09). */
export function useMembershipFigures(range: { inRange: (date: string | null | undefined) => boolean }) {
  const memberships = useMemberships();
  const membershipList = useMemo(() => memberships.data ?? [], [memberships.data]);
  return {
    memberships,
    membershipList,
    activatedInPeriod: membershipList.filter((item) => range.inRange(item.activationDate)).length,
    active: membershipList.filter((item) => item.status === "active").length,
    pending: membershipList.filter((item) => item.status === "pending").length,
  };
}

/** Membership report body without page chrome, for the Reports area tab. */
export function MembershipReportPanel() {
  const range = useReportRange();
  const { memberships, membershipList, activatedInPeriod, active, pending } = useMembershipFigures(range);
  const products = useVipProducts();
  const tierCodes = (products.data ?? []).map((product) => product.code);
  const inPeriod = useMemo(() => membershipList.filter((item) => range.inRange(item.activationDate) || range.inRange(item.createdAt)), [membershipList, range]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [tier, setTier] = useState("all");
  const rows = useMemo(() => inPeriod.filter((item) => (status === "all" || item.status === status) && (tier === "all" || item.productCode === tier) && matchesSearch(search, item.customerName, item.cardId)), [inPeriod, status, tier, search]);
  return (
    <ReportFrame range={range}>
      <AdminStatGrid columns={3}>
        <AdminStatCard loading={memberships.isLoading} error={memberships.error} label="Activated" value={activatedInPeriod} icon={UserCheck} tone="success" />
        <AdminStatCard loading={memberships.isLoading} error={memberships.error} label="Active members" value={active} icon={Medal} tone="info" />
        <AdminStatCard loading={memberships.isLoading} error={memberships.error} label="Pending activation" value={pending} icon={Clock} tone="warning" />
      </AdminStatGrid>
      <ReportTable report="Membership Report" fileName="memberships" range={range} columns={COLUMNS} rows={rows} getRowId={(row) => row.id} loading={memberships.isLoading} error={memberships.error} emptyText="No memberships match."
        filters={(exportButton) => <FilterBar search={search} onSearch={setSearch} searchLabel="Search memberships" filters={[
          { label: "Membership status filter", value: status, onChange: setStatus, options: optionsFrom("All statuses", inPeriod.map((item) => item.status), humanize) },
          { label: "VIP tier filter", value: tier, onChange: setTier, options: optionsFrom("All tiers", tierCodes) },
        ]}>{range.dateFields}{exportButton}</FilterBar>} />
    </ReportFrame>
  );
}

export function MembershipReportPage() {
  return (
    <AdminPage anyOf={["reports"]} title="Membership Report" crumbs={[{ label: "Reports" }, { label: "Membership Report" }]}>
      <MembershipReportPanel />
    </AdminPage>
  );
}
