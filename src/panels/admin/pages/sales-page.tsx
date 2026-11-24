"use client";

import { useMemo, useState } from "react";
import { BadgeCheck, CalendarCheck, Clock, Receipt, SlidersHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";
import { useApproveDeal, useCorrectVipCommission, useMarkSaleDefaulted, useOperation, useSales } from "@/data/business-queries";
import { useTierDisplayName } from "../components/use-tier-display-name";
import { useConfirmRun } from "@/shared/components/modern/use-confirm-run";
import { useMembers } from "@/data/queries";
import { parsePesoToCentavos } from "@/shared/lib/money";
import { FormDialog, ReasonDialog } from "@/shared/components/modern/form-dialog";
import { approveDealConfirm, buildSalesMenuProps } from "../actions/sales-contract-actions";
import type { SaleView } from "@/data/contracts/sale-repository";
import type { TableOrder } from "@/shared/lib/table-order";
import { confirmedValueInPeriod, mySales, referredSales, teamSales, totalsFor } from "@/modules/sales/rules";
import { manilaToday } from "@/shared/lib/dates";
import { DataTable, type ColumnDef } from "@/shared/components/modern/data-table";
import { RowActionsMenu } from "@/shared/components/modern/row-actions-menu";
import { SelectField, StandardDateField, TextField } from "@/shared/forms/modern";
import { useDevIdentity } from "@/shared/providers/dev-identity-provider";
import { useContractHref } from "../components/use-contract-href";
import { BizBadge } from "@/shared/components/business/biz-badge";
import { FilterBar } from "@/shared/components/modern/filter-bar";
import { Money } from "@/shared/components/modern/money";
import { QueryState } from "@/shared/components/modern/query-state";
import { RecordDetailsSheet } from "@/shared/components/modern/record-details-sheet";
import { Button } from "@/shared/ui/button";
import { formatDate } from "@/shared/lib/format-date";
import { AdminStatCard, AdminStatGrid } from "@/shared/components/admin";
import { saleExpiryReminderText } from "@/modules/sales/accreditation-standing";

function VipCommissionCorrectionDialog({ sale, canApprove, onClose }: { sale: SaleView; canApprove: boolean; onClose: () => void }) {
  const members = useMembers();
  const save = useCorrectVipCommission();
  const [referrer, setReferrer] = useState(sale.referrerMemberId ?? "none");
  const [dsc, setDsc] = useState("");
  const [dri, setDri] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string>();

  const teamBranch = members.data?.find((member) => member.id === sale.sellerMemberId)?.branchId;
  const referrerOptions = [
    { value: "none", label: "No referrer" },
    ...(members.data ?? [])
      .filter((member) => !teamBranch || member.branchId === teamBranch)
      .map((member) => ({ value: member.id, label: member.displayName })),
  ];

  return (
    <FormDialog open title="Correct VIP Commission" description={sale.customerName} submitText="Save Correction" pending={save.isPending} error={error} onClose={onClose} onSubmit={() => {
      const dscRateBp = dsc.trim() ? parsePesoToCentavos(dsc) : undefined;
      const driRateBp = referrer !== "none" && dri.trim() ? parsePesoToCentavos(dri) : undefined;
      if (dscRateBp === null || driRateBp === null) {
        setError("Enter a valid rate as a percentage.");
        return;
      }
      void save.mutateAsync({ id: sale.id, referrerMemberId: referrer === "none" ? null : referrer, dscRateBp, driRateBp, reason })
        .then(onClose, (failure: Error) => setError(failure.message));
    }}>
      <SelectField label="Referrer" value={referrer} onChange={(value) => { setReferrer(value); setDri(""); }} options={referrerOptions} />
      {canApprove && sale.commissionRates ? <>
        <TextField label="Closing seller rate (%)" hint="Leave blank to keep the frozen rate." value={dsc} onChange={setDsc} inputMode="decimal" />
        {referrer !== "none" ? <TextField label="Referrer rate (%)" hint="Leave blank to use the applicable approved rate." value={dri} onChange={setDri} inputMode="decimal" /> : null}
      </> : null}
      <TextField label="Reason" required value={reason} onChange={setReason} />
    </FormDialog>
  );
}

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "confirmed", label: "Confirmed" },
  { value: "pending", label: "Pending" },
  { value: "cancelled", label: "Cancelled" },
  { value: "rejected", label: "Rejected" },
  { value: "defaulted", label: "Stopped Paying" },
];

/** Pending sales show "Awaiting approval" until an approver approves them. */
function saleBadgeStatus(sale: SaleView): string {
  return sale.approval || sale.status !== "pending" ? sale.status : "awaiting_approval";
}

type SalesScope = "mine" | "team" | "referred" | "all";

/** Sales tab of the Sales area (the area page checks the `sales` grant). */
/** Newest recorded sale first; pending and defaulted sales rise ahead on the same date. */
const SALE_ORDER: TableOrder<SaleView> = {
  date: (row) => row.confirmedDate ?? row.recordedDate,
  attention: (row) => (row.status === "pending" ? 2 : row.status === "defaulted" ? 1 : 0),
};

export function SalesTab() {
  const router = useRouter();
  const sales = useSales();
  const tierName = useTierDisplayName();
  const approveDeal = useApproveDeal();
  const markDefaulted = useMarkSaleDefaulted();
  const [defaultSale, setDefaultSale] = useState<SaleView | null>(null);
  const { confirmRun, dialog } = useConfirmRun();
  const [correction, setCorrection] = useState<SaleView | null>(null);
  const canPrepare = useOperation("contracts.prepare");
  const canApprove = useOperation("contracts.approve");
  const canApproveCustomer = useOperation("customers.approve");
  const { identity } = useDevIdentity();
  const viewTeam = useOperation("sales.viewTeam");
  const contractHref = useContractHref();
  const monthStart = `${manilaToday().slice(0, 7)}-01`;
  const [scope, setScope] = useState<SalesScope>(identity.memberId ? "mine" : "all");
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(manilaToday());
  const [detailId, setDetailId] = useState<string | null>(null);

  const scoped = useMemo(() => {
    const all = sales.data ?? [];
    if (!identity.memberId || scope === "all") return all;
    if (scope === "mine") return mySales(all, identity.memberId);
    if (scope === "referred") return referredSales(all, identity.memberId);
    return teamSales(all, identity.memberId);
  }, [sales.data, scope, identity.memberId]);

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return scoped.filter((sale) => (status === "all" || (status === "no-payment" ? sale.defaultEligible : sale.status === status)) && (term === "" || sale.customerName.toLowerCase().includes(term))).sort((a, b) => b.recordedDate.localeCompare(a.recordedDate));
  }, [scoped, status, search]);

  const totals = totalsFor(scoped);
  const inPeriod = confirmedValueInPeriod(scoped, from, to);

  // A referrer may sit outside the sale's team, so the referred list offers no contract link.
  const referredView = scope === "referred";
  const columns = useMemo<ColumnDef<SaleView, unknown>[]>(
    () => [
      { id: "customer", header: "Customer", cell: ({ row }) => <span className="tw:font-semibold">{row.original.customerName}</span> },
      { id: "value", header: "Sale", cell: ({ row }) => <Money value={row.original.valueCentavos} /> },
      { id: "plan", header: "Plan", meta: { className: "tw:hidden tw:sm:table-cell" }, cell: ({ row }) => tierName(row.original.productCode) },
      { id: "seller", header: "Seller", meta: { className: "tw:hidden tw:md:table-cell" }, cell: ({ row }) => row.original.sellerName ?? "Company" },
      { id: "status", header: "Status", cell: ({ row }) => <BizBadge status={saleBadgeStatus(row.original)} /> },
    ],
    [tierName],
  );

  const detail = detailId ? rows.find((row) => row.id === detailId) ?? null : null;
  const scopes = identity.memberId ? [{ value: "mine", label: "My sales" }, { value: "referred", label: "Referred by me" }, ...(viewTeam ? [{ value: "team", label: "Team sales" }] : [])] : [{ value: "all", label: "All sales" }];

  return (
    <>
      {dialog}
      {correction ? <VipCommissionCorrectionDialog sale={correction} canApprove={canApprove} onClose={() => setCorrection(null)} /> : null}
      <ReasonDialog open={defaultSale !== null} title="Mark Sale as Stopped Paying" description={defaultSale?.customerName ?? ""} confirmText="Stopped Paying" tone="warning" successText="Sale marked as Stopped Paying." onClose={() => setDefaultSale(null)} onSubmit={(reason) => defaultSale ? markDefaulted.mutateAsync({ id: defaultSale.id, reason }) : Promise.resolve()} />
      {referredView ? null : <AdminStatGrid>
        <AdminStatCard label="Confirmed" value={<Money value={totals.confirmed} />} icon={BadgeCheck} tone="brand" description={`${totals.confirmedCount} sale(s)`} />
        <AdminStatCard label="Pending" value={<Money value={totals.pending} />} icon={Clock} tone="warning" description={`${totals.pendingCount} sale(s)`} />
        <AdminStatCard label="Overall Recorded" value={<Money value={totals.overall} />} icon={Receipt} tone="info" />
        <AdminStatCard label="Confirmed This Period" value={<Money value={inPeriod} />} icon={CalendarCheck} tone="violet" description="After refunds and reversals" />
      </AdminStatGrid>}
      <FilterBar search={search} onSearch={setSearch} searchLabel="Search sales" filters={[...(scopes.length > 1 ? [{ label: "Show", value: scope, onChange: (value: string) => setScope(value as SalesScope), options: scopes }] : []), { label: "Sale status filter", value: status, onChange: setStatus, options: canApprove ? [...STATUS_OPTIONS, { value: "no-payment", label: "No approved receipt for 90 days" }] : STATUS_OPTIONS }]}>
        <StandardDateField label="Period from" value={from} onChange={setFrom} className="tw:md:min-w-0 tw:md:flex-1" />
        <StandardDateField label="Period to" value={to} onChange={setTo} className="tw:md:min-w-0 tw:md:flex-1" />
      </FilterBar>
      <QueryState isLoading={sales.isLoading} error={sales.error}>
        <DataTable
          data={rows}
          columns={columns}
          getRowId={(row) => row.id}
          emptyText="No sales match."
          caption="Sales"
          orderBy={SALE_ORDER}
          onRowOpen={(row) => setDetailId(row.id)}
          getRowLabel={(row) => `Open the sale for ${row.customerName}`}
          rowActions={referredView ? undefined : (row) => {
            const menu = buildSalesMenuProps(row, { canApprove, canApproveCustomer }, {
              onApproveDeal: () => confirmRun(approveDealConfirm(() => approveDeal.mutateAsync({ contractId: row.contractId }))),
              onMarkDefaulted: () => setDefaultSale(row),
            });
            return <RowActionsMenu {...menu} extraItems={[...menu.extraItems, ...((canApprove || canPrepare) && (row.status === "pending" || row.status === "confirmed") ? [{ key: "correct-commission", label: "Correct Commission", tone: "warning" as const, icon: SlidersHorizontal, onClick: () => setCorrection(row) }] : [])]} />;
          }}
        />
      </QueryState>
      <RecordDetailsSheet
        open={detail !== null}
        onClose={() => setDetailId(null)}
        title={detail ? `Sale for ${detail.customerName}` : "Sale"}
        badge={detail ? <BizBadge status={saleBadgeStatus(detail)} /> : undefined}
        sections={detail ? [
          {
            rows: [
              { label: "Customer", value: detail.customerName },
              { label: "Plan", value: tierName(detail.productCode) },
              { label: "Payment plan", value: detail.schemeLabel },
              { label: "Sale value", value: <Money value={detail.valueCentavos} /> },
              { label: "Seller", value: detail.sellerName ?? "Company" },
              { label: "Recorded", value: formatDate(detail.recordedDate) },
              { label: "Confirmed", value: formatDate(detail.confirmedDate) },
            ],
          },
          ...((detail.expiryReminders ?? []).length > 0 ? [{ title: "Reminders", rows: (detail.expiryReminders ?? []).map((reminder) => ({ label: reminder.role === "seller" ? "Seller" : "Referrer", value: saleExpiryReminderText(reminder) })) }] : []),
        ] : []}
        footer={detail && !referredView ? <Button className="tw:min-h-11 tw:sm:min-h-8" variant="indigo" onClick={() => router.push(contractHref(detail.contractId))}>Open Contract</Button> : undefined}
      />
    </>
  );
}
