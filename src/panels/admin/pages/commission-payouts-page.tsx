"use client";

import { EMPTY } from "@/shared/lib/empty-value";
import { useState } from "react";
import { useBulkCommissionPayout, useCommissionPayoutListAction, useCommissionPayoutLists, useOperation } from "@/data/business-queries";
import type { CommissionView } from "@/data/contracts/commission-repository";
import { Money } from "@/shared/components/modern/money";
import { ListChecks } from "lucide-react";
import { useConfirmRun } from "@/shared/components/modern/use-confirm-run";
import { awaitingConfirmation, bulkSummary, PayoutDialog, readyToPay } from "../components/commission-shared";
import { Button } from "@/shared/ui/button";
import { formatPeso } from "@/shared/lib/money";
import { RecordDetailsSheet } from "@/shared/components/modern/record-details-sheet";
import type { CommissionPayoutList } from "@/modules/commissions/types";

/** "2026-10" as "October 2026". */
function monthLabel(month: string): string {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Date(Date.UTC(year, monthNumber - 1, 1)).toLocaleDateString("en-PH", { month: "long", year: "numeric", timeZone: "UTC" });
}

const plural = (count: number, noun: string) => `${count} ${noun}${count === 1 ? "" : "s"}`;
const listTotal = (list: CommissionPayoutList) => list.entries.reduce((sum, item) => sum + item.amountCentavos, 0);

/**
 * Month-end payout bar at the top of the Commissions tab (doc 08 §11). Month close prepares
 * the list; staff approve it, record one payout for every ready commission, then confirm
 * disbursement. Each commission is still recorded and audited on its own, and only confirmed
 * disbursement makes it Paid. Held commissions are never confirmed in bulk (§11.6).
 */
export function CommissionPayoutBar({ commissions }: { commissions: CommissionView[] }) {
  const canPayout = useOperation("commission.payout");
  const canPrepare = useOperation("commission.payout.prepare");
  const canApprove = useOperation("commission.approve");
  const lists = useCommissionPayoutLists(canPrepare);
  const listAction = useCommissionPayoutListAction();
  const bulk = useBulkCommissionPayout();
  const { confirmRun, dialog } = useConfirmRun();
  const [recording, setRecording] = useState(false);
  const [listId, setListId] = useState<string | null>(null);

  const pending = (lists.data ?? []).filter((list) => !list.approvedAt);
  const ready = canPayout ? commissions.filter(readyToPay) : [];
  const toConfirm = canPayout ? commissions.filter((item) => item.status === "approved" && awaitingConfirmation(item)) : [];
  const selectedList = pending.find(({ id }) => id === listId);

  function approve(list: CommissionPayoutList) {
    setListId(null);
    confirmRun({
      title: "Approve payout list?", description: `Approve ${plural(list.entries.length, "commission")} from ${monthLabel(list.month)} (${formatPeso(listTotal(list))}) for payment.`,
      confirmText: "Approve list", tone: "success", action: () => listAction.mutateAsync({ kind: "approve", id: list.id }),
      successTitle: "Payout list approved.", errorTitle: "Could not approve",
    });
  }

  function confirmAll() {
    const ids = toConfirm.map(({ id }) => id);
    confirmRun({
      title: "Confirm all disbursed?", description: `Mark ${plural(ids.length, "commission")} as Paid. Do this only after the money has reached each seller.`,
      confirmText: "Confirm all", tone: "success",
      action: async () => {
        const result = await bulk.mutateAsync({ kind: "confirm", ids });
        if (result.failed.length) throw new Error(bulkSummary(result, "confirmed"));
      },
      successTitle: `${ids.length} confirmed. They are now Paid.`, errorTitle: "Not all disbursements were confirmed",
    });
  }

  return (
    <>
      {dialog}
      {pending.length || ready.length || toConfirm.length ? (
        <section aria-label="Month-end payout" className="tw:mb-5 tw:grid tw:gap-3 tw:rounded-lg tw:border tw:bg-card tw:p-4">
          {pending.map((list) => (
            <div key={list.id} className="tw:flex tw:flex-wrap tw:items-center tw:justify-between tw:gap-3">
              <p className="tw:font-semibold">
                List for {monthLabel(list.month)}: {plural(list.entries.length, "commission")}, <Money value={listTotal(list)} />
              </p>
              <div className="tw:flex tw:flex-wrap tw:gap-2">
                <Button type="button" variant="outline" onClick={() => setListId(list.id)}>Review list</Button>
                {canApprove ? <Button type="button" variant="success" onClick={() => approve(list)}>Approve list</Button> : null}
              </div>
            </div>
          ))}
          {ready.length || toConfirm.length ? (
            <div className="tw:flex tw:flex-wrap tw:gap-2">
              {ready.length ? <Button type="button" onClick={() => setRecording(true)}>Record payout for all ready ({ready.length})</Button> : null}
              {toConfirm.length ? <Button type="button" variant="success" onClick={confirmAll}>Confirm all disbursed ({toConfirm.length})</Button> : null}
            </div>
          ) : null}
        </section>
      ) : null}
      <RecordDetailsSheet open={Boolean(selectedList)} title={selectedList ? `List for ${monthLabel(selectedList.month)}` : "Payout list"} onClose={() => setListId(null)}
        subtitle="Waiting for approval" icon={<ListChecks />}
        sections={selectedList ? [{
          title: "Payout list",
          rows: [
            { label: "Month", value: monthLabel(selectedList.month) },
            { label: "Commissions", value: selectedList.entries.length },
            { label: "Total amount", value: <Money value={listTotal(selectedList)} /> },
          ],
        }, {
          title: "Commissions",
          rows: selectedList.entries.map((entry) => {
            const commission = commissions.find(({ id }) => id === entry.commissionId);
            const label = commission ? `${commission.recipientName} · ${commission.saleReference ?? commission.customerName}`
              : `${entry.recipientName ?? EMPTY} · ${entry.saleLabel ?? EMPTY}`;
            return { label, value: <Money value={entry.amountCentavos} /> };
          }),
        }] : []}
        footer={canApprove && selectedList ? <Button type="button" variant="success" onClick={() => approve(selectedList)}>Approve list</Button> : undefined} />
      {recording ? <PayoutDialog commissions={ready} onClose={() => setRecording(false)} /> : null}
    </>
  );
}
