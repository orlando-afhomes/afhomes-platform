"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useCommissionAction, useCommissionClawbackAction, useCommissionClawbacks, useCommissions, useOperation } from "@/data/business-queries";
import type { CommissionView } from "@/data/contracts/commission-repository";
import { DataTable } from "@/shared/components/modern/data-table";
import { useConfirmRun } from "@/shared/components/modern/use-confirm-run";
import { Button, buttonVariants } from "@/shared/ui/button";
import { FormDialog, ReasonDialog } from "@/shared/components/modern/form-dialog";
import { Money } from "@/shared/components/modern/money";
import { RowActionsMenu } from "@/shared/components/modern/row-actions-menu";
import { QueryState } from "@/shared/components/modern/query-state";
import { AdminPage, AdminStatGrid, AdminStatCard } from "@/shared/components/admin";
import { BadgeCheck, Clock, CircleCheck, ReceiptText } from "lucide-react";
import { AdjustDialog, COMMISSION_COLUMNS, CommissionDetailsSheet, HoldDialog, type CommissionMenuItem } from "../components/commission-shared";
import { clawbackBalance } from "@/modules/commissions/rules";
import type { CommissionClawback } from "@/modules/commissions/types";
import { MoneyField, TextField } from "@/shared/forms/modern";
import { parsePesoToCentavos } from "@/shared/lib/money";
import { humanize } from "@/shared/lib/humanize";
import { matchesSearch, optionsFrom } from "@/shared/lib/search";
import { FilterBar } from "@/shared/components/modern/filter-bar";

type DialogState = { kind: "adjust" | "cancel" | "hold"; commission: CommissionView } | null;

export function CommissionsPage() {
  const canApprove = useOperation("commission.approve");
  const canSetRates = useOperation("commission.rates.manage");
  const commissions = useCommissions();
  const action = useCommissionAction();
  const { dialog } = useConfirmRun();
  const [state, setState] = useState<DialogState>(null);
  const [detailId, setDetailId] = useState<string | null>(null);

  const all = useMemo(() => commissions.data ?? [], [commissions.data]);
  const totals = useMemo(() => {
    const sum = (status: CommissionView["status"]) => all.filter((item) => item.status === status).reduce((total, item) => total + item.amountCentavos, 0);
    return { approved: sum("approved"), held: sum("on_hold"), paid: sum("paid") };
  }, [all]);

  /** Workflow actions for a commission, in the row menu and the details sheet footer. */
  const itemsFor = (item: CommissionView): CommissionMenuItem[] => {
    if (!canApprove) return [];
    const items: CommissionMenuItem[] = [];
    if (item.status === "approved" && !item.payout && !item.releaseDate) items.push({ key: "adjust", label: "Adjust", onClick: () => setState({ kind: "adjust", commission: item }) });
    if (item.status === "on_hold") items.push({ key: "hold", label: "Resolve hold", onClick: () => setState({ kind: "hold", commission: item }) });
    if ((item.status === "approved" || item.status === "on_hold") && !(item.payout && !item.payout.confirmedAt)) items.push({ key: "cancel", label: "Cancel commission", danger: true, onClick: () => setState({ kind: "cancel", commission: item }) });
    return items;
  };
  const detail = detailId ? all.find((item) => item.id === detailId) ?? null : null;
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [productFilter, setProductFilter] = useState("all");
  const statusOptions = useMemo(() => optionsFrom("All statuses", all.map((item) => item.status), humanize), [all]);
  const productOptions = useMemo(() => optionsFrom("All products", all.map((item) => item.product), humanize), [all]);
  const visible = useMemo(
    () =>
      all.filter(
        (item) =>
          (statusFilter === "all" || item.status === statusFilter) &&
          (productFilter === "all" || item.product === productFilter) &&
          matchesSearch(search, item.recipientName, item.customerName, item.saleReference),
      ),
    [all, search, statusFilter, productFilter],
  );
  return (
    <AdminPage
      anyOf={["commissions"]}
      title="Commissions"
      description={canApprove ? "Finance approves and confirms payouts. Approved is not Paid." : "Your commissions. Approved is not Paid; only confirmed disbursement makes a commission Paid."}
      crumbs={[{ label: "Finance" }, { label: "Commissions" }]}
      actions={
        canSetRates ? (
          <Link href="/admin/commissions/assignment" className={buttonVariants({ className: "tw:min-h-11 tw:sm:min-h-8" })}>
            Commission rates
          </Link>
        ) : null
      }
    >
      {dialog}
      <AdminStatGrid>
        <AdminStatCard label="Approved, unpaid" value={<Money value={totals.approved} />} icon={BadgeCheck} tone="brand" />
        <AdminStatCard label="On hold" value={<Money value={totals.held} />} icon={Clock} tone="warning" />
        <AdminStatCard label="Paid" value={<Money value={totals.paid} />} icon={CircleCheck} tone="success" />
        <AdminStatCard label="Records" value={all.length} icon={ReceiptText} tone="neutral" />
      </AdminStatGrid>
      <FilterBar
        search={search}
        onSearch={setSearch}
        searchLabel="Search commissions"
        filters={[
          { label: "Status filter", value: statusFilter, onChange: setStatusFilter, options: statusOptions },
          { label: "Product filter", value: productFilter, onChange: setProductFilter, options: productOptions },
        ]}
      />
      <QueryState isLoading={commissions.isLoading} error={commissions.error}>
        <DataTable
          data={visible}
          columns={COMMISSION_COLUMNS}
          getRowId={(row) => row.id}
          emptyText={all.length === 0 ? "No commissions yet." : "No commissions match the filters."}
          caption="Commissions"
          onRowOpen={(row) => setDetailId(row.id)}
          getRowLabel={(row) => `Open commission for ${row.recipientName}`}
          rowActions={(row) => <RowActionsMenu itemName={`commission for ${row.recipientName}`} onView={() => setDetailId(row.id)} extraItems={itemsFor(row)} />}
        />
      </QueryState>
      <CommissionDetailsSheet detail={detail} onClose={() => setDetailId(null)} items={detail ? itemsFor(detail) : []} />
      {state?.kind === "adjust" ? <AdjustDialog commission={state.commission} onClose={() => setState(null)} /> : null}
      <ReasonDialog open={state?.kind === "cancel"} title="Cancel commission" description="A cancelled commission can no longer be paid. This is recorded in the audit history." confirmText="Cancel commission" danger successText="Commission cancelled." onClose={() => setState(null)} onSubmit={(reason) => (state?.kind === "cancel" ? action.mutateAsync({ id: state.commission.id, action: "cancel", reason }) : Promise.resolve())} />
      {state?.kind === "hold" ? <HoldDialog commission={state.commission} onClose={() => setState(null)} /> : null}
      <ClawbackLedger enabled={canApprove || all.length > 0} commissions={all} />
    </AdminPage>
  );
}

function ClawbackLedger({ enabled, commissions }: { enabled: boolean; commissions: CommissionView[] }) {
  const canCollect = useOperation("commission.clawback.collect");
  const canWriteOff = useOperation("commission.clawback.writeOff");
  const query = useCommissionClawbacks(enabled);
  const action = useCommissionClawbackAction();
  const [collecting, setCollecting] = useState<CommissionClawback | null>(null);
  const [writeOff, setWriteOff] = useState<CommissionClawback | null>(null);
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [error, setError] = useState<string>();
  if (!enabled) return null;
  return (
    <section className="tw:grid tw:gap-3 tw:mt-5">
      <h2 className="tw:text-lg tw:font-semibold">Commission recovery</h2>
      <QueryState isLoading={query.isLoading} error={query.error}>
        <DataTable data={query.data ?? []} caption="Commission recovery" emptyText="No recovery records." getRowId={(row) => row.id} columns={[
          { header: "Seller", cell: ({ row }) => commissions.find((item) => item.id === row.original.commissionId)?.recipientName ?? row.original.recipientMemberId },
          { header: "Reason", cell: ({ row }) => humanize(row.original.trigger) },
          { header: "Original amount", cell: ({ row }) => <Money value={row.original.amountCentavos} /> },
          { header: "Recovered", cell: ({ row }) => <Money value={row.original.recoveries.reduce((sum, item) => sum + item.amountCentavos, 0)} /> },
          { header: "Balance", cell: ({ row }) => <Money value={clawbackBalance(row.original)} /> },
          { header: "Status", cell: ({ row }) => row.original.refundDueCentavos ? <>Refund due <Money value={row.original.refundDueCentavos} /></> : row.original.writeOff ? "Written off" : clawbackBalance(row.original) === 0 ? "Recovered" : "Owed" },
          { header: "Actions", cell: ({ row }) => clawbackBalance(row.original) > 0 ? <div className="tw:flex tw:flex-wrap tw:gap-2">
            {canCollect ? <Button variant="outline" onClick={() => { setError(undefined); setAmount(""); setReference(""); setCollecting(row.original); }}>Record collection</Button> : null}
            {canWriteOff ? <Button variant="outline" onClick={() => setWriteOff(row.original)}>Write off</Button> : null}
          </div> : null },
        ]} />
      </QueryState>
      {collecting ? <FormDialog open title="Record direct collection" submitText="Record collection" pending={action.isPending} error={error}
        onClose={() => setCollecting(null)} onSubmit={() => {
          const amountCentavos = parsePesoToCentavos(amount);
          if (!amountCentavos) { setError("Enter the amount collected."); return; }
          void action.mutateAsync({ kind: "collect", id: collecting.id, amountCentavos, reference })
            .then(() => setCollecting(null)).catch((failure: Error) => setError(failure.message));
        }}>
        <MoneyField label="Amount collected" required value={amount} onChange={setAmount} />
        <TextField label="Collection reference" required value={reference} onChange={setReference} />
      </FormDialog> : null}
      <ReasonDialog open={writeOff !== null} title="Write off this balance" description="The original amount and collections stay in history." confirmText="Write off" danger
        successText="Balance written off." onClose={() => setWriteOff(null)}
        onSubmit={(reason) => writeOff ? action.mutateAsync({ kind: "writeOff", id: writeOff.id, reason }) : Promise.resolve()} />
    </section>
  );
}

