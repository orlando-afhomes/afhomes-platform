"use client";

import { useMemo, useState } from "react";
import { Coins, Gift, Undo2, Wallet } from "lucide-react";
import type { PromoLedgerRow } from "@/data/contracts/promo-repository";
import { usePromoBalances, usePromoLedger } from "@/data/promo-queries";
import { AdminSection, AdminStatCard, AdminStatGrid } from "@/shared/components/admin";
import { FilterBar } from "@/shared/components/modern/filter-bar";
import { formatDate } from "@/shared/lib/format-date";
import { humanize } from "@/shared/lib/humanize";
import { matchesSearch, optionsFrom } from "@/shared/lib/search";
import { ReportShell, ReportTable, useReportRange, type ReportColumn } from "../components/report-shell";
import { signedPoints } from "./promo-points-page";

const COLUMNS: ReportColumn<PromoLedgerRow>[] = [
  { header: "Date", value: (row) => formatDate(row.date) },
  { header: "Customer", value: (row) => row.customerName },
  { header: "VIP Number", value: (row) => row.vipNumber ?? "" },
  { header: "Promo", value: (row) => row.promoName },
  { header: "Type", value: (row) => `${humanize(row.type)}${row.voided ? " (voided)" : ""}` },
  { header: "Outlet", value: (row) => row.outletName ?? "" },
  { header: "Points", value: (row) => String(signedPoints(row)) },
  { header: "Reference", value: (row) => row.sourceBillId ?? row.note ?? "" },
];

export function PromoPointsReportPage() {
  const range = useReportRange();
  const ledger = usePromoLedger();
  const balances = usePromoBalances();
  const inPeriod = useMemo(() => (ledger.data ?? []).filter((row) => range.inRange(row.date)), [ledger.data, range]);
  const [search, setSearch] = useState("");
  const [type, setType] = useState("all");
  const [promo, setPromo] = useState("all");
  const rows = useMemo(
    () => inPeriod.filter((row) => (type === "all" || row.type === type) && (promo === "all" || row.promoName === promo) && matchesSearch(search, row.customerName, row.vipNumber, row.promoName, row.outletName)),
    [inPeriod, type, promo, search],
  );
  const sum = (kind: PromoLedgerRow["type"]) => inPeriod.filter((row) => row.type === kind && !(kind === "use" && row.voided)).reduce((total, row) => total + row.points, 0);
  const outstanding = (balances.data ?? []).reduce((total, item) => total + item.total.available, 0);
  const fmt = (value: number) => value.toLocaleString("en-PH");
  return (
    <ReportShell range={range} title="Promo Points Report" description="Promo Points are a separate wallet from Grant Stay Points. Figures come from the Promo Points ledger." crumbs={[{ label: "Reports" }, { label: "Promo Points Report" }]}>
      <AdminSection title="Promo Points" description="The selected period filters entries by entry date. Outstanding covers all dates and leaves out expired points.">
        <AdminStatGrid>
          <AdminStatCard loading={ledger.isLoading} error={ledger.error} label="Points earned" value={fmt(sum("earn"))} icon={Gift} tone="success" />
          <AdminStatCard loading={ledger.isLoading} error={ledger.error} label="Points used" value={fmt(sum("use"))} icon={Coins} />
          <AdminStatCard loading={ledger.isLoading} error={ledger.error} label="Reversed on refund" value={fmt(sum("earn_reversal"))} icon={Undo2} tone="warning" />
          <AdminStatCard loading={balances.isLoading} error={balances.error} label="Outstanding" value={fmt(outstanding)} icon={Wallet} tone="info" />
        </AdminStatGrid>
      </AdminSection>
      <ReportTable report="Promo Points Report" fileName="promo-points" range={range} columns={COLUMNS} rows={rows} getRowId={(row) => row.id} loading={ledger.isLoading} error={ledger.error} emptyText="No Promo Points entries match."
        filters={<FilterBar search={search} onSearch={setSearch} searchLabel="Search Promo Points" filters={[
          { label: "Promo filter", value: promo, onChange: setPromo, options: optionsFrom("All promos", inPeriod.map((row) => row.promoName)) },
          { label: "Entry type filter", value: type, onChange: setType, options: optionsFrom("All entry types", inPeriod.map((row) => row.type), humanize) },
        ]} />} />
    </ReportShell>
  );
}
