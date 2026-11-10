"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useCommissionAction, useCommissions, useOperation } from "@/data/business-queries";
import type { CommissionView } from "@/data/contracts/commission-repository";
import { DataTable } from "@/shared/components/modern/data-table";
import { useConfirmRun } from "@/shared/components/modern/use-confirm-run";
import { buttonVariants } from "@/shared/ui/button";
import { ReasonDialog } from "@/shared/components/modern/form-dialog";
import { Money } from "@/shared/components/modern/money";
import { RowActionsMenu } from "@/shared/components/modern/row-actions-menu";
import { QueryState } from "@/shared/components/modern/query-state";
import { AdminPage, AdminStatGrid, AdminStatCard, AdminSection } from "@/shared/components/admin";
import { BadgeCheck, Clock, CircleCheck, ReceiptText } from "lucide-react";
import { AdjustDialog, COMMISSION_COLUMNS, CommissionDetailsSheet, HoldDialog, type CommissionMenuItem } from "../components/commission-shared";

type DialogState = { kind: "adjust" | "cancel" | "hold"; commission: CommissionView } | null;

export function CommissionsPage() {
  const canApprove = useOperation("commission.approve");
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
    if (item.status === "approved" && !item.payout) items.push({ key: "adjust", label: "Adjust", onClick: () => setState({ kind: "adjust", commission: item }) });
    if (item.status === "on_hold") items.push({ key: "hold", label: "Resolve hold", onClick: () => setState({ kind: "hold", commission: item }) });
    if ((item.status === "approved" || item.status === "on_hold") && !(item.payout && !item.payout.confirmedAt)) items.push({ key: "cancel", label: "Cancel commission", danger: true, onClick: () => setState({ kind: "cancel", commission: item }) });
    return items;
  };
  const detail = detailId ? all.find((item) => item.id === detailId) ?? null : null;
  return (
    <AdminPage
      anyOf={["commissions"]}
      title="Commissions"
      description={canApprove ? "Finance approves and confirms payouts. Approved is not Paid." : "Your commissions. Approved is not Paid; only confirmed disbursement makes a commission Paid."}
      crumbs={[{ label: "Finance" }, { label: "Commissions" }]}
      actions={
        canApprove ? (
          <Link href="/admin/commissions/assignment" className={buttonVariants({ className: "tw:min-h-11 tw:sm:min-h-8" })}>
            Commission assignment
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
      <AdminSection title="Commission records">
        <QueryState isLoading={commissions.isLoading} error={commissions.error}>
          <DataTable
            data={all}
            columns={COMMISSION_COLUMNS}
            getRowId={(row) => row.id}
            emptyText="No commissions yet."
            caption="Commissions"
            onRowOpen={(row) => setDetailId(row.id)}
            getRowLabel={(row) => `Open commission for ${row.recipientName}`}
            rowActions={(row) => <RowActionsMenu itemName={`commission for ${row.recipientName}`} onView={() => setDetailId(row.id)} extraItems={itemsFor(row)} />}
          />
        </QueryState>
      </AdminSection>
      <CommissionDetailsSheet detail={detail} onClose={() => setDetailId(null)} items={detail ? itemsFor(detail) : []} />
      {state?.kind === "adjust" ? <AdjustDialog commission={state.commission} onClose={() => setState(null)} /> : null}
      <ReasonDialog open={state?.kind === "cancel"} title="Cancel commission" description="A cancelled commission can no longer be paid. This is recorded in the audit history." confirmText="Cancel commission" danger successText="Commission cancelled." onClose={() => setState(null)} onSubmit={(reason) => (state?.kind === "cancel" ? action.mutateAsync({ id: state.commission.id, action: "cancel", reason }) : Promise.resolve())} />
      {state?.kind === "hold" ? <HoldDialog commission={state.commission} onClose={() => setState(null)} /> : null}
    </AdminPage>
  );
}

