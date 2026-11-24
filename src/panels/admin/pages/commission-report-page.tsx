"use client";

import { useMemo, useState } from "react";
import { useCommissions } from "@/data/business-queries";
import { Money } from "@/shared/components/modern/money";
import { AdminPage, AdminStatGrid, AdminStatCard } from "@/shared/components/admin";
import { BadgeCheck, Banknote, Clock } from "lucide-react";
import type { CommissionView } from "@/data/contracts/commission-repository";
import { FilterBar } from "@/shared/components/modern/filter-bar";
import { formatDate } from "@/shared/lib/format-date";
import { humanize } from "@/shared/lib/humanize";
import { commissionRoleLabel } from "@/modules/commissions/types";
import { formatPeso } from "@/shared/lib/money";
import { matchesSearch, optionsFrom } from "@/shared/lib/search";
import { describeFilters, ReportFrame, ReportTable, useReportRange, type ReportColumn } from "../components/report-shell";

const COLUMNS: ReportColumn<CommissionView>[] = [
  { header: "Recipient", value: (item) => item.recipientName },
  { header: "Role", value: (item) => (item.role ? commissionRoleLabel(item.role) : "") },
  { header: "Customer", value: (item) => item.customerName },
  { header: "Product", value: (item) => item.product ?? "", screen: false },
  { header: "Amount", value: (item) => formatPeso(item.amountCentavos) },
  { header: "Status", value: (item) => humanize(item.status) },
  { header: "Approved", value: (item) => formatDate(item.approvedAt), screen: false },
  { header: "Paid", value: (item) => (item.payout?.confirmedAt ? formatDate(item.payout.countedDate ?? item.payout.payoutDate) : ""), screen: false },
];

/** Paid date of a commission: confirmed disbursement only, on its counted date or payout date (doc 08). */
const paidDate = (item: CommissionView) => (item.payout?.confirmedAt ? item.payout.countedDate ?? item.payout.payoutDate : null);

/** Commission figures: approvals by approval date and confirmed payouts by disbursement date. Approved is not Paid. */
export function useCommissionFigures(range: { inRange: (date: string | null | undefined) => boolean }) {
  const commissions = useCommissions();
  const commissionList = useMemo(() => commissions.data ?? [], [commissions.data]);
  const approvedInPeriod = commissionList.filter((item) => range.inRange(item.approvedAt)).reduce((sum, item) => sum + item.amountCentavos, 0);
  const paidInPeriod = commissionList.filter((item) => range.inRange(paidDate(item))).reduce((sum, item) => sum + item.amountCentavos, 0);
  const approvedUnpaid = commissionList.filter((item) => item.status === "approved").reduce((sum, item) => sum + item.amountCentavos, 0);
  return { commissions, commissionList, approvedInPeriod, paidInPeriod, approvedUnpaid };
}

/** Commission report body without page chrome, for the Reports area tab. */
export function CommissionReportPanel() {
  const range = useReportRange();
  const { commissions, commissionList, approvedInPeriod, paidInPeriod, approvedUnpaid } = useCommissionFigures(range);
  const inPeriod = useMemo(() => commissionList.filter((item) => range.inRange(item.approvedAt) || range.inRange(paidDate(item))), [commissionList, range]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [role, setRole] = useState("all");
  const rows = useMemo(() => inPeriod.filter((item) => (status === "all" || item.status === status) && (role === "all" || item.role === role) && matchesSearch(search, item.recipientName, item.customerName)), [inPeriod, status, role, search]);
  const metadata = describeFilters([
    search.trim() ? `Search "${search.trim()}"` : null,
    status !== "all" ? `Status: ${humanize(status)}` : null,
    role !== "all" ? `Role: ${commissionRoleLabel(role)}` : null,
  ]);
  return (
    <ReportFrame range={range}>
      <AdminStatGrid columns={3}>
        <AdminStatCard loading={commissions.isLoading} error={commissions.error} label="Approved" value={<Money value={approvedInPeriod} />} icon={BadgeCheck} tone="brand" />
        <AdminStatCard loading={commissions.isLoading} error={commissions.error} label="Paid" value={<Money value={paidInPeriod} />} icon={Banknote} tone="success" />
        <AdminStatCard loading={commissions.isLoading} error={commissions.error} label="Approved, Unpaid" value={<Money value={approvedUnpaid} />} icon={Clock} tone="accent" />
      </AdminStatGrid>
      <ReportTable report="Commission Report" fileName="commissions" range={range} metadata={metadata} columns={COLUMNS} rows={rows} getRowId={(row) => row.id} loading={commissions.isLoading} error={commissions.error} emptyText="No commissions match."
        filters={(exportButton) => <FilterBar search={search} onSearch={setSearch} searchLabel="Search commissions" filters={[
          { label: "Commission status filter", value: status, onChange: setStatus, options: optionsFrom("All statuses", inPeriod.map((item) => item.status), humanize) },
          { label: "Commission role filter", value: role, onChange: setRole, options: optionsFrom("All roles", inPeriod.map((item) => item.role), commissionRoleLabel) },
        ]}>{range.dateFields}{exportButton}</FilterBar>} />
    </ReportFrame>
  );
}

export function CommissionReportPage() {
  return (
    <AdminPage anyOf={["reports"]} title="Commission Report" crumbs={[{ label: "Reports" }, { label: "Commission Report" }]}>
      <CommissionReportPanel />
    </AdminPage>
  );
}
