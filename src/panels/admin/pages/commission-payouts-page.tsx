"use client";

import { useMemo, useState } from "react";
import { useCommissionAction, useCommissions, useOperation } from "@/data/business-queries";
import type { CommissionView } from "@/data/contracts/commission-repository";
import { PAYOUT_RELEASE_WAIT_DAYS } from "@/modules/commissions/rules";
import { DataTable } from "@/shared/components/modern/data-table";
import { InfoNote } from "@/shared/components/modern/detail-list";
import { Money } from "@/shared/components/modern/money";
import { QueryState } from "@/shared/components/modern/query-state";
import { RowActionsMenu } from "@/shared/components/modern/row-actions-menu";
import { AdminPage, AdminStatGrid, AdminStatCard, AdminSection } from "@/shared/components/admin";
import { BadgeCheck, Banknote, Clock } from "lucide-react";
import { useConfirmRun } from "@/shared/components/modern/use-confirm-run";
import { COMMISSION_COLUMNS, CommissionDetailsSheet, PayoutDialog, RELEASE_PERCENT, releaseOpen, type CommissionMenuItem } from "../components/commission-shared";

/** Commission payouts: record a payout once release opens, then confirm disbursement. Only confirmed disbursement makes a commission Paid. */
export function CommissionPayoutsPage() {
  const canPayout = useOperation("commission.payout");
  const commissions = useCommissions();
  const action = useCommissionAction();
  const { confirmRun, dialog } = useConfirmRun();
  const [payoutFor, setPayoutFor] = useState<CommissionView | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);

  const approved = useMemo(() => (commissions.data ?? []).filter((item) => item.status === "approved"), [commissions.data]);
  const awaiting = approved.filter((item) => item.payout && !item.payout.confirmedAt);
  const ready = approved.filter((item) => !item.payout && releaseOpen(item));

  const itemsFor = (item: CommissionView): CommissionMenuItem[] => {
    if (!canPayout) return [];
    if (!item.payout) return releaseOpen(item) ? [{ key: "payout", label: "Record payout", onClick: () => setPayoutFor(item) }] : [];
    if (item.payout.confirmedAt) return [];
    return [{ key: "confirm", label: "Confirm disbursement", onClick: () => confirmRun({ title: "Confirm disbursement?", description: `Mark ${item.recipientName}'s commission as Paid. Only confirmed disbursement makes a commission Paid.`, confirmText: "Confirm", action: () => action.mutateAsync({ id: item.id, action: "confirm" }), successTitle: "Commission marked as Paid.", errorTitle: "Could not confirm" }) }];
  };
  const detail = detailId ? approved.find((item) => item.id === detailId) ?? null : null;

  return (
    <AdminPage anyOf={["commissions"]} title="Commission Payouts" description="Record payouts for approved commissions and confirm disbursement. Approved is not Paid." crumbs={[{ label: "Finance" }, { label: "Commission Payouts" }]}>
      {dialog}
      {canPayout ? (
        <>
          <AdminStatGrid columns={3}>
            <AdminStatCard label="Approved, unpaid" value={<Money value={approved.reduce((total, item) => total + item.amountCentavos, 0)} />} icon={BadgeCheck} tone="brand" />
            <AdminStatCard label="Payout ready" value={ready.length} icon={Banknote} tone="warning" />
            <AdminStatCard label="Awaiting confirmation" value={awaiting.length} icon={Clock} tone="info" />
          </AdminStatGrid>
          <InfoNote title="Payout release">A payout can be recorded {PAYOUT_RELEASE_WAIT_DAYS} days after {RELEASE_PERCENT}% of the contract value is Finance-verified.</InfoNote>
          <AdminSection title="Approved commissions">
            <QueryState isLoading={commissions.isLoading} error={commissions.error}>
              <DataTable
                data={approved}
                columns={COMMISSION_COLUMNS}
                getRowId={(row) => row.id}
                emptyText="No approved commissions are waiting for payout."
                caption="Commission payouts"
                onRowOpen={(row) => setDetailId(row.id)}
                getRowLabel={(row) => `Open commission for ${row.recipientName}`}
                rowActions={(row) => <RowActionsMenu itemName={`commission for ${row.recipientName}`} onView={() => setDetailId(row.id)} extraItems={itemsFor(row)} />}
              />
            </QueryState>
          </AdminSection>
          <CommissionDetailsSheet detail={detail} onClose={() => setDetailId(null)} items={detail ? itemsFor(detail) : []} />
          {payoutFor ? <PayoutDialog commission={payoutFor} onClose={() => setPayoutFor(null)} /> : null}
        </>
      ) : (
        <InfoNote title="Access restricted">This account is not authorized to record commission payouts.</InfoNote>
      )}
    </AdminPage>
  );
}
