"use client";

import { useMemo, useState } from "react";
import { useStayPoints } from "@/data/business-queries";
import { isGiftRelease } from "@/modules/stay-points/engine";
import { AdminStatGrid, AdminStatCard, AdminSection } from "@/shared/components/admin";
import { Clock, Gift, TrendingUp, Wallet } from "lucide-react";
import type { GiftLedgerEntry } from "@/modules/stay-points/types";
import { FilterBar } from "@/shared/components/modern/filter-bar";
import { formatDate } from "@/shared/lib/format-date";
import { humanize } from "@/shared/lib/humanize";
import { matchesSearch, optionsFrom } from "@/shared/lib/search";
import { ReportShell, ReportTable, useReportRange, type ReportColumn } from "../components/report-shell";

type PointsRow = GiftLedgerEntry & { customerName: string };

const COLUMNS: ReportColumn<PointsRow>[] = [
  { header: "Date", value: (row) => formatDate(row.date) },
  { header: "Customer", value: (row) => row.customerName },
  { header: "VIP Number", value: (row) => row.vipNumber },
  { header: "Type", value: (row) => humanize(row.type) },
  { header: "Tranche", value: (row) => String(row.tranche) },
  { header: "Bucket", value: (row) => humanize(row.bucket) },
  { header: "Points", value: (row) => row.points.toLocaleString("en-PH") },
  { header: "Reference", value: (row) => row.reference ?? "" },
];

export function StayPointsReportPage() {
  const range = useReportRange();
  const points = useStayPoints();
  const ledgers = (points.data ?? []).flatMap(({ ledger }) => ledger ? [ledger] : []);
  const released = ledgers.flatMap((ledger) => ledger.entries).filter((entry) => range.inRange(entry.date) && isGiftRelease(entry)).reduce((sum, entry) => sum + entry.points, 0);
  const inPeriod = useMemo<PointsRow[]>(() => (points.data ?? []).flatMap((item) => (item.ledger?.entries ?? []).filter((entry) => range.inRange(entry.date)).map((entry) => ({ ...entry, customerName: item.customerName }))), [points.data, range]);
  const [search, setSearch] = useState("");
  const [type, setType] = useState("all");
  const [bucket, setBucket] = useState("all");
  const rows = useMemo(() => inPeriod.filter((row) => (type === "all" || row.type === type) && (bucket === "all" || row.bucket === bucket) && matchesSearch(search, row.customerName, row.vipNumber, row.reference)), [inPeriod, type, bucket, search]);
  const total = (pick: (balances: (typeof ledgers)[number]["balances"]) => number) => ledgers.reduce((sum, ledger) => sum + pick(ledger.balances), 0).toLocaleString("en-PH");
  return (
    <ReportShell range={range} title="Stay Points Report" description="Role-scoped figures built from the source records." crumbs={[{ label: "Reports" }, { label: "Stay Points Report" }]}>
      <AdminSection title="Stay points" description="The selected period filters releases by release date. Current balances cover all dates.">
        <AdminStatGrid>
          <AdminStatCard loading={points.isLoading} error={points.error} label="Points released" value={released.toLocaleString("en-PH")} icon={TrendingUp} tone="success" />
          <AdminStatCard loading={points.isLoading} error={points.error} label="Available" value={total((balance) => balance.spendableWeekday + balance.spendableWeekend)} icon={Wallet} tone="success" />
          <AdminStatCard loading={points.isLoading} error={points.error} label="Reserved" value={total((balance) => balance.reserved)} icon={Clock} tone="warning" />
          <AdminStatCard loading={points.isLoading} error={points.error} label="Redeemed" value={total((balance) => balance.redeemed)} icon={Gift} />
        </AdminStatGrid>
      </AdminSection>
      <ReportTable report="Stay Points Report" fileName="stay-points" range={range} columns={COLUMNS} rows={rows} getRowId={(row) => `${row.membershipId}-${row.tranche}-${row.bucket}-${row.type}-${row.date}-${row.reference ?? ""}`} loading={points.isLoading} error={points.error} emptyText="No point entries match."
        filters={<FilterBar search={search} onSearch={setSearch} searchLabel="Search stay points" filters={[
          { label: "Entry type filter", value: type, onChange: setType, options: optionsFrom("All entry types", inPeriod.map((row) => row.type), humanize) },
          { label: "Points bucket filter", value: bucket, onChange: setBucket, options: optionsFrom("All buckets", inPeriod.map((row) => row.bucket), humanize) },
        ]} />} />
    </ReportShell>
  );
}
