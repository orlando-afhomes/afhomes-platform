"use client";

import { useMemo, useState } from "react";
import { useCommissions } from "@/data/business-queries";
import { Money } from "@/shared/components/modern/money";
import { AdminStatGrid, AdminStatCard, AdminSection } from "@/shared/components/admin";
import { BadgeCheck, Banknote, Clock, Hourglass } from "lucide-react";
import type { CommissionView } from "@/data/contracts/commission-repository";
import { FilterBar } from "@/shared/components/modern/filter-bar";
import { formatDate } from "@/shared/lib/format-date";
import { humanize } from "@/shared/lib/humanize";
import { formatPeso } from "@/shared/lib/money";
import { matchesSearch, optionsFrom } from "@/shared/lib/search";
import { ReportShell, ReportTable, useReportRange, type ReportColumn } from "../components/report-shell";

const COLUMNS: ReportColumn<CommissionView>[] = [
  { header: "Recipient", value: (item) => item.recipientName },
  { header: "Role", value: (item) => item.role ?? "" },
  { header: "Customer", value: (item) => item.customerName },
  { header: "Product", value: (item) => item.product ?? "" },
  { header: "Amount", value: (item) => formatPeso(item.amountCentavos) },
  { header: "Status", value: (item) => humanize(item.status) },
  { header: "Approved", value: (item) => formatDate(item.approvedAt) },
  { header: "Paid", value: (item) => (item.payout?.confirmedAt ? formatDate(item.payout.countedDate ?? item.payout.payoutDate) : "") },
];

export function CommissionReportPage() {
  const range = useReportRange();
  const commissions = useCommissions();
  const commissionList = useMemo(() => commissions.data ?? [], [commissions.data]);
  const approvedInPeriod = commissionList.filter((item) => range.inRange(item.approvedAt)).reduce((sum, item) => sum + item.amountCentavos, 0);
  const paidInPeriod = commissionList.filter((item) => item.payout?.confirmedAt && range.inRange(item.payout.countedDate ?? item.payout.payoutDate)).reduce((sum, item) => sum + item.amountCentavos, 0);
  const inPeriod = useMemo(() => commissionList.filter((item) => range.inRange(item.approvedAt) || Boolean(item.payout?.confirmedAt && range.inRange(item.payout.countedDate ?? item.payout.payoutDate))), [commissionList, range]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [role, setRole] = useState("all");
  const rows = useMemo(() => inPeriod.filter((item) => (status === "all" || item.status === status) && (role === "all" || item.role === role) && matchesSearch(search, item.recipientName, item.customerName)), [inPeriod, status, role, search]);
  return (
    <ReportShell range={range} title="Commission Report" description="Role-scoped figures built from the source records." crumbs={[{ label: "Reports" }, { label: "Commission Report" }]}>
      <AdminSection title="Commission obligations" description="Approvals use the approval date. Confirmed payouts use the disbursement date or the first open month.">
        <AdminStatGrid>
          <AdminStatCard loading={commissions.isLoading} error={commissions.error} label="Approved" value={<Money value={approvedInPeriod} />} icon={BadgeCheck} tone="brand" />
          <AdminStatCard loading={commissions.isLoading} error={commissions.error} label="Paid" value={<Money value={paidInPeriod} />} icon={Banknote} tone="success" />
          <AdminStatCard loading={commissions.isLoading} error={commissions.error} label="Approved, unpaid" value={<Money value={commissionList.filter((item) => item.status === "approved").reduce((sum, item) => sum + item.amountCentavos, 0)} />} icon={Clock} tone="accent" />
          <AdminStatCard loading={commissions.isLoading} error={commissions.error} label="On hold" value={<Money value={commissionList.filter((item) => item.status === "on_hold").reduce((sum, item) => sum + item.amountCentavos, 0)} />} icon={Hourglass} tone="warning" />
        </AdminStatGrid>
      </AdminSection>
      <ReportTable report="Commission Report" fileName="commissions" range={range} columns={COLUMNS} rows={rows} getRowId={(row) => row.id} loading={commissions.isLoading} error={commissions.error} emptyText="No commissions match."
        filters={<FilterBar search={search} onSearch={setSearch} searchLabel="Search commissions" filters={[
          { label: "Commission status filter", value: status, onChange: setStatus, options: optionsFrom("All statuses", inPeriod.map((item) => item.status), humanize) },
          { label: "Commission role filter", value: role, onChange: setRole, options: optionsFrom("All roles", inPeriod.map((item) => item.role)) },
        ]} />} />
    </ReportShell>
  );
}
