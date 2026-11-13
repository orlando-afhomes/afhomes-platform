"use client";

import { useMemo, useState } from "react";
import { useCommissionAction, useCommissionPayoutListAction, useCommissionPayoutLists, useCommissions, useOperation } from "@/data/business-queries";
import type { CommissionView } from "@/data/contracts/commission-repository";
import { DataTable } from "@/shared/components/modern/data-table";
import { Money } from "@/shared/components/modern/money";
import { QueryState } from "@/shared/components/modern/query-state";
import { RowActionsMenu } from "@/shared/components/modern/row-actions-menu";
import { AdminPage, AdminStatGrid, AdminStatCard } from "@/shared/components/admin";
import { BadgeCheck, Banknote, Clock } from "lucide-react";
import { useConfirmRun } from "@/shared/components/modern/use-confirm-run";
import { COMMISSION_COLUMNS, CommissionDetailsSheet, PayoutDialog, releaseOpen, type CommissionMenuItem } from "../components/commission-shared";
import { Button } from "@/shared/ui/button";
import { FormDialog, ReasonDialog } from "@/shared/components/modern/form-dialog";
import { TextField } from "@/shared/forms/modern";
import { manilaToday } from "@/shared/lib/dates";
import { formatDate } from "@/shared/lib/format-date";
import { RecordDetailsSheet } from "@/shared/components/modern/record-details-sheet";
import type { CommissionPayoutList } from "@/modules/commissions/types";
import { FilterBar } from "@/shared/components/modern/filter-bar";
import { matchesSearch } from "@/shared/lib/search";

/** Commission payouts: record a payout once release opens, then confirm disbursement. Only confirmed disbursement makes a commission Paid. */
export function CommissionPayoutsPage() {
  const canPayout = useOperation("commission.payout");
  const canPrepare = useOperation("commission.payout.prepare");
  const canApprove = useOperation("commission.approve");
  const commissions = useCommissions();
  const action = useCommissionAction();
  const { confirmRun, dialog } = useConfirmRun();
  const [payoutFor, setPayoutFor] = useState<CommissionView | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [voidId, setVoidId] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [month, setMonth] = useState(manilaToday().slice(0, 7));
  const [prepareError, setPrepareError] = useState<string>();
  const [listId, setListId] = useState<string | null>(null);
  const lists = useCommissionPayoutLists(canPrepare);
  const listAction = useCommissionPayoutListAction();

  const approved = useMemo(() => (commissions.data ?? []).filter((item) => item.status === "approved" || (item.status === "on_hold" && item.payout && !item.payout.confirmedAt)), [commissions.data]);
  const awaiting = approved.filter((item) => item.payout && !item.payout.confirmedAt);
  const ready = approved.filter((item) => !item.payout && releaseOpen(item));

  const itemsFor = (item: CommissionView): CommissionMenuItem[] => {
    if (!canPayout) return [];
    if (!item.payout) return releaseOpen(item) ? [{ key: "payout", label: "Record payout", onClick: () => setPayoutFor(item) }] : [];
    if (item.payout.confirmedAt) return [];
    return [
      { key: "confirm", label: "Confirm disbursement", onClick: () => confirmRun({ title: "Confirm disbursement?", description: `Mark ${item.recipientName}'s commission as paid.`, confirmText: "Confirm", action: () => action.mutateAsync({ id: item.id, action: "confirm" }), successTitle: "Commission marked as Paid.", errorTitle: "Could not confirm" }) },
      ...(item.status === "on_hold" ? [{ key: "void", label: "Void payout", danger: true, onClick: () => setVoidId(item.id) }] : []),
    ];
  };
  const detail = detailId ? approved.find((item) => item.id === detailId) ?? null : null;
  const selectedList = lists.data?.find(({ id }) => id === listId);

  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState("all");
  const [listSearch, setListSearch] = useState("");
  const [listStatus, setListStatus] = useState("all");
  const visible = useMemo(
    () => approved.filter((item) => (stateFilter === "all" || (item.payout && !item.payout.confirmedAt ? "awaiting" : item.payout ? "other" : releaseOpen(item) ? "ready" : "not_open") === stateFilter) && matchesSearch(search, item.recipientName, item.customerName, item.saleReference)),
    [approved, search, stateFilter],
  );
  const visibleLists = useMemo(
    () => (lists.data ?? []).filter((list) => (listStatus === "all" || (list.approvedAt ? "approved" : "prepared") === listStatus) && matchesSearch(listSearch, list.month)),
    [lists.data, listSearch, listStatus],
  );

  function approve(list: CommissionPayoutList) {
    setListId(null);
    confirmRun({
      title: "Approve payout list?", description: `Approve eligible commissions from ${list.month} for payment.`,
      confirmText: "Approve", action: () => listAction.mutateAsync({ kind: "approve", id: list.id }),
      successTitle: "Payout list approved.", errorTitle: "Could not approve",
    });
  }

  return (
    <AdminPage anyOf={["commissions", "sales"]} allowed={canPrepare || canPayout} title="Commission Payouts" description="Prepare month-end payout lists, record disbursements, and confirm payment." crumbs={[{ label: "Finance" }, { label: "Commission Payouts" }]}>
      {dialog}
      {canPrepare ? (
        <section className="tw:grid tw:gap-3 tw:mb-5">
          <div className="tw:flex tw:flex-wrap tw:justify-between tw:items-center tw:gap-2">
            <h2 className="tw:text-lg tw:font-semibold">Monthly payout lists</h2>
            <Button onClick={() => { setPrepareError(undefined); setPreparing(true); }}>Prepare payout list</Button>
          </div>
          <FilterBar search={listSearch} onSearch={setListSearch} searchLabel="Search payout lists by month" filters={[{ label: "List status filter", value: listStatus, onChange: setListStatus, options: [{ value: "all", label: "All lists" }, { value: "prepared", label: "Prepared" }, { value: "approved", label: "Approved" }] }]} />
          <QueryState isLoading={lists.isLoading} error={lists.error}>
            <DataTable data={visibleLists} caption="Monthly payout lists" emptyText={(lists.data ?? []).length === 0 ? "No payout lists prepared." : "No payout lists match the filters."} getRowId={(row) => row.id}
              onRowOpen={(row) => setListId(row.id)} getRowLabel={(row) => `Review payout list for ${row.month}`} columns={[
              { header: "Month", accessorKey: "month" },
              { header: "Commissions", cell: ({ row }) => row.original.entries.length },
              { header: "Amount", cell: ({ row }) => <Money value={row.original.entries.reduce((sum, item) => sum + item.amountCentavos, 0)} /> },
              { header: "Status", cell: ({ row }) => row.original.approvedAt ? `Approved ${formatDate(row.original.approvedAt)}` : "Prepared" },
              { header: "Review", cell: ({ row }) => <Button variant="outline" onClick={() => setListId(row.original.id)}>Review list</Button> },
            ]} />
          </QueryState>
          <RecordDetailsSheet open={Boolean(selectedList)} title={selectedList ? `Payout list for ${selectedList.month}` : "Payout list"} onClose={() => setListId(null)}
            sections={selectedList ? [{
              title: "Commissions",
              rows: selectedList.entries.map((entry) => {
                const commission = commissions.data?.find(({ id }) => id === entry.commissionId);
                const label = commission ? `${commission.recipientName} · ${commission.saleReference ?? commission.customerName}`
                  : `${entry.recipientName ?? entry.recipientMemberId} · ${entry.saleLabel ?? entry.saleId}`;
                return { label, value: <><Money value={entry.amountCentavos} /> {selectedList.approvedAt && selectedList.approvedCommissionIds && !selectedList.approvedCommissionIds.includes(entry.commissionId) ? "· Excluded from approval" : ""}</> };
              }),
            }] : []}
            footer={canApprove && selectedList && !selectedList.approvedAt ? <Button onClick={() => approve(selectedList)}>Approve list</Button> : undefined} />
          {preparing ? <FormDialog open title="Prepare payout list" submitText="Prepare list" error={prepareError}
            pending={listAction.isPending} onClose={() => setPreparing(false)}
            onSubmit={() => void listAction.mutateAsync({ kind: "prepare", month }).then(() => setPreparing(false)).catch((failure: Error) => setPrepareError(failure.message))}>
            <TextField label="Closed month (YYYY-MM)" required value={month} onChange={setMonth} />
          </FormDialog> : null}
        </section>
      ) : null}
      {canPayout ? (
        <>
          <AdminStatGrid columns={3}>
            <AdminStatCard label="Approved, unpaid" value={<Money value={approved.reduce((total, item) => total + item.amountCentavos, 0)} />} icon={BadgeCheck} tone="brand" />
            <AdminStatCard label="Payout ready" value={ready.length} icon={Banknote} tone="warning" />
            <AdminStatCard label="Awaiting confirmation" value={awaiting.length} icon={Clock} tone="info" />
          </AdminStatGrid>
          <FilterBar search={search} onSearch={setSearch} searchLabel="Search commissions" filters={[{ label: "Payout state filter", value: stateFilter, onChange: setStateFilter, options: [{ value: "all", label: "All payout states" }, { value: "ready", label: "Ready to record" }, { value: "awaiting", label: "Awaiting confirmation" }, { value: "not_open", label: "Release not open" }] }]} />
          <QueryState isLoading={commissions.isLoading} error={commissions.error}>
            <DataTable
              data={visible}
              columns={COMMISSION_COLUMNS}
              getRowId={(row) => row.id}
              emptyText={approved.length === 0 ? "No approved commissions are waiting for payout." : "No commissions match the filters."}
              caption="Commission payouts"
              onRowOpen={(row) => setDetailId(row.id)}
              getRowLabel={(row) => `Open commission for ${row.recipientName}`}
              rowActions={(row) => <RowActionsMenu itemName={`commission for ${row.recipientName}`} onView={() => setDetailId(row.id)} extraItems={itemsFor(row)} />}
            />
          </QueryState>
          <CommissionDetailsSheet detail={detail} onClose={() => setDetailId(null)} items={detail ? itemsFor(detail) : []} />
          {payoutFor ? <PayoutDialog commission={payoutFor} onClose={() => setPayoutFor(null)} /> : null}
        </>
      ) : null}
      <ReasonDialog open={voidId !== null} title="Void initiated payout" description="The voided payout stays in the record." confirmText="Void payout" danger successText="Payout voided."
        onClose={() => setVoidId(null)} onSubmit={(reason) => voidId ? action.mutateAsync({ id: voidId, action: "void", reason }) : Promise.resolve()} />
    </AdminPage>
  );
}
