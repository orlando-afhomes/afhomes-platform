"use client";

import { useMemo, useState } from "react";
import { Coins, Gift, Wallet } from "lucide-react";
import type { PromoLedgerRow } from "@/data/contracts/promo-repository";
import { usePromoBalances, usePromoLedger } from "@/data/promo-queries";
import { AdminPage, AdminStatCard, AdminStatGrid } from "@/shared/components/admin";
import { FilterBar } from "@/shared/components/modern/filter-bar";
import { formatDate } from "@/shared/lib/format-date";
import { humanize } from "@/shared/lib/humanize";
import { matchesSearch, optionsFrom } from "@/shared/lib/search";
import { ReportFrame, ReportTable, useReportRange, type ReportColumn } from "../components/report-shell";
import { signedPoints } from "./promo-points-page";

const COLUMNS: ReportColumn<PromoLedgerRow>[] = [
  { header: "Date", value: (row) => formatDate(row.date) },
  { header: "Customer", value: (row) => row.customerName },
  { header: "VIP Number", value: (row) => row.vipNumber ?? "", screen: false },
  { header: "Promo", value: (row) => row.promoName },
  { header: "Type", value: (row) => `${humanize(row.type)}${row.voided ? " (voided)" : ""}` },
  { header: "Outlet", value: (row) => row.outletName ?? "", screen: false },
  { header: "Points", value: (row) => String(signedPoints(row)) },
  { header: "Reference", value: (row) => row.sourceBillId ?? row.note ?? "", screen: false },
];

/**
 * Promo Points figures from the Promo Points ledger, a wallet separate from Grant Stay Points. The range filters
 * entries by entry date; Outstanding covers all dates and leaves out expired points.
 */
export function usePromoPointsFigures(range: { inRange: (date: string | null | undefined) => boolean }) {
  const ledger = usePromoLedger();
  const balances = usePromoBalances();
  const inPeriod = useMemo(() => (ledger.data ?? []).filter((row) => range.inRange(row.date)), [ledger.data, range]);
  const sum = (kind: PromoLedgerRow["type"]) => inPeriod.filter((row) => row.type === kind && !(kind === "use" && row.voided)).reduce((total, row) => total + row.points, 0);
  return {
    ledger,
    balances,
    inPeriod,
    earned: sum("earn"),
    used: sum("use"),
    outstanding: (balances.data ?? []).reduce((total, item) => total + item.total.available, 0),
  };
}

/** Promo Points report body without page chrome, for the Reports area tab. */
export function PromoPointsReportPanel() {
  const range = useReportRange();
  const { ledger, balances, inPeriod, earned, used, outstanding } = usePromoPointsFigures(range);
  const [search, setSearch] = useState("");
  const [type, setType] = useState("all");
  const [promo, setPromo] = useState("all");
  const rows = useMemo(
    () => inPeriod.filter((row) => (type === "all" || row.type === type) && (promo === "all" || row.promoName === promo) && matchesSearch(search, row.customerName, row.vipNumber, row.promoName, row.outletName)),
    [inPeriod, type, promo, search],
  );
  const fmt = (value: number) => value.toLocaleString("en-PH");
  return (
    <ReportFrame range={range}>
      <AdminStatGrid columns={3}>
        <AdminStatCard loading={ledger.isLoading} error={ledger.error} label="Points earned" value={fmt(earned)} icon={Gift} tone="success" />
        <AdminStatCard loading={ledger.isLoading} error={ledger.error} label="Points used" value={fmt(used)} icon={Coins} />
        <AdminStatCard loading={balances.isLoading} error={balances.error} label="Outstanding" value={fmt(outstanding)} icon={Wallet} tone="info" />
      </AdminStatGrid>
      <ReportTable report="Promo Points Report" fileName="promo-points" range={range} columns={COLUMNS} rows={rows} getRowId={(row) => row.id} getRowTitle={(row) => row.customerName} loading={ledger.isLoading} error={ledger.error} emptyText="No Promo Points entries match."
        filters={<FilterBar search={search} onSearch={setSearch} searchLabel="Search Promo Points" filters={[
          { label: "Promo filter", value: promo, onChange: setPromo, options: optionsFrom("All promos", inPeriod.map((row) => row.promoName)) },
          { label: "Entry type filter", value: type, onChange: setType, options: optionsFrom("All entry types", inPeriod.map((row) => row.type), humanize) },
        ]} />} />
    </ReportFrame>
  );
}

export function PromoPointsReportPage() {
  return (
    <AdminPage anyOf={["reports"]} title="Promo Points Report" crumbs={[{ label: "Reports" }, { label: "Promo Points Report" }]}>
      <PromoPointsReportPanel />
    </AdminPage>
  );
}
