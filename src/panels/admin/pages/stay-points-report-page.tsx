"use client";

import { useMemo, useState } from "react";
import { useStayPoints } from "@/data/business-queries";
import { isGiftRelease } from "@/modules/stay-points/engine";
import { AdminPage, AdminStatGrid, AdminStatCard } from "@/shared/components/admin";
import { Gift, TrendingUp, Wallet } from "lucide-react";
import type { GiftLedgerEntry } from "@/modules/stay-points/types";
import { FilterBar } from "@/shared/components/modern/filter-bar";
import { formatDate } from "@/shared/lib/format-date";
import { humanize } from "@/shared/lib/humanize";
import { matchesSearch, optionsFrom } from "@/shared/lib/search";
import { ReportFrame, ReportTable, useReportRange, type ReportColumn } from "../components/report-shell";

type PointsRow = GiftLedgerEntry & { customerName: string };

const COLUMNS: ReportColumn<PointsRow>[] = [
  { header: "Date", value: (row) => formatDate(row.date) },
  { header: "Customer", value: (row) => row.customerName },
  { header: "VIP Number", value: (row) => row.vipNumber },
  { header: "Type", value: (row) => humanize(row.type) },
  { header: "Tranche", value: (row) => String(row.tranche), screen: false },
  { header: "Bucket", value: (row) => humanize(row.bucket), screen: false },
  { header: "Points", value: (row) => row.points.toLocaleString("en-PH") },
  { header: "Reference", value: (row) => row.reference ?? "", screen: false },
];

/** Stay Points figures. The range filters releases by release date; balances cover all dates (doc 09). */
export function useStayPointsFigures(range: { inRange: (date: string | null | undefined) => boolean }) {
  const points = useStayPoints();
  const ledgers = (points.data ?? []).flatMap(({ ledger }) => (ledger ? [ledger] : []));
  const released = ledgers.flatMap((ledger) => ledger.entries).filter((entry) => range.inRange(entry.date) && isGiftRelease(entry)).reduce((sum, entry) => sum + entry.points, 0);
  const total = (pick: (balances: (typeof ledgers)[number]["balances"]) => number) => ledgers.reduce((sum, ledger) => sum + pick(ledger.balances), 0);
  return {
    points,
    released,
    available: total((balance) => balance.spendableWeekday + balance.spendableWeekend),
    redeemed: total((balance) => balance.redeemed),
  };
}

/** Stay Points report body without page chrome, for the Reports area tab. */
export function StayPointsReportPanel() {
  const range = useReportRange();
  const { points, released, available, redeemed } = useStayPointsFigures(range);
  const inPeriod = useMemo<PointsRow[]>(() => (points.data ?? []).flatMap((item) => (item.ledger?.entries ?? []).filter((entry) => range.inRange(entry.date)).map((entry) => ({ ...entry, customerName: item.customerName }))), [points.data, range]);
  const [search, setSearch] = useState("");
  const [type, setType] = useState("all");
  const [bucket, setBucket] = useState("all");
  const rows = useMemo(() => inPeriod.filter((row) => (type === "all" || row.type === type) && (bucket === "all" || row.bucket === bucket) && matchesSearch(search, row.customerName, row.vipNumber, row.reference)), [inPeriod, type, bucket, search]);
  const fmt = (value: number) => value.toLocaleString("en-PH");
  return (
    <ReportFrame range={range}>
      <AdminStatGrid columns={3}>
        <AdminStatCard loading={points.isLoading} error={points.error} label="Points released" value={fmt(released)} icon={TrendingUp} tone="success" />
        <AdminStatCard loading={points.isLoading} error={points.error} label="Available" value={fmt(available)} icon={Wallet} tone="success" />
        <AdminStatCard loading={points.isLoading} error={points.error} label="Redeemed" value={fmt(redeemed)} icon={Gift} />
      </AdminStatGrid>
      <ReportTable report="Stay Points Report" fileName="stay-points" range={range} columns={COLUMNS} rows={rows} getRowId={(row) => `${row.membershipId}-${row.tranche}-${row.bucket}-${row.type}-${row.date}-${row.reference ?? ""}`} getRowTitle={(row) => row.customerName} loading={points.isLoading} error={points.error} emptyText="No point entries match."
        filters={<FilterBar search={search} onSearch={setSearch} searchLabel="Search stay points" filters={[
          { label: "Entry type filter", value: type, onChange: setType, options: optionsFrom("All entry types", inPeriod.map((row) => row.type), humanize) },
          { label: "Points bucket filter", value: bucket, onChange: setBucket, options: optionsFrom("All buckets", inPeriod.map((row) => row.bucket), humanize) },
        ]} />} />
    </ReportFrame>
  );
}

export function StayPointsReportPage() {
  return (
    <AdminPage anyOf={["reports"]} title="Stay Points Report" crumbs={[{ label: "Reports" }, { label: "Stay Points Report" }]}>
      <StayPointsReportPanel />
    </AdminPage>
  );
}
