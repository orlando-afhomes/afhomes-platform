"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useApproveCommission, useEligibleSales, useOperation } from "@/data/business-queries";
import type { EligibleSale } from "@/data/contracts/commission-repository";
import { PAYOUT_RELEASE_THRESHOLD_BP, PAYOUT_RELEASE_WAIT_DAYS } from "@/modules/commissions/rules";
import { applyBasisPoints, MoneyError, parsePercentToBasisPoints } from "@/shared/lib/money";
import { DataTable, type ColumnDef } from "@/shared/components/modern/data-table";
import { InfoNote } from "@/shared/components/modern/detail-list";
import { CheckboxField, PercentField } from "@/shared/forms/modern";
import { Button, buttonVariants } from "@/shared/ui/button";
import { FormDialog } from "@/shared/components/modern/form-dialog";
import { Money } from "@/shared/components/modern/money";
import { RecordDetailsSheet } from "@/shared/components/modern/record-details-sheet";
import { RowActionsMenu } from "@/shared/components/modern/row-actions-menu";
import { QueryState } from "@/shared/components/modern/query-state";
import { AdminPage } from "@/shared/components/admin";
import { formatDate } from "@/shared/lib/format-date";

const peso = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });

/**
 * Commission Assignment (owner ruling 2026-11-09): Finance manually enters the
 * percentage for each seller of a Confirmed Sale. No default rate exists (08 section 9.1).
 */
export function CommissionAssignmentPage() {
  const canApprove = useOperation("commission.approve");
  const eligible = useEligibleSales(canApprove);
  const [selected, setSelected] = useState<EligibleSale | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);

  const columns = useMemo<ColumnDef<EligibleSale, unknown>[]>(
    () => [
      { id: "customer", header: "Customer", cell: ({ row }) => <span className="tw:font-semibold">{row.original.customerName}</span> },
      { id: "plan", header: "Plan", meta: { className: "tw:hidden tw:sm:table-cell" }, cell: ({ row }) => row.original.productCode },
      { id: "value", header: "Contract value", cell: ({ row }) => <Money value={row.original.valueCentavos} /> },
      { id: "confirmed", header: "Confirmed", meta: { className: "tw:hidden tw:md:table-cell" }, cell: ({ row }) => formatDate(row.original.confirmedDate) },
      { id: "recipients", header: "Recipients", meta: { className: "tw:hidden tw:md:table-cell" }, cell: ({ row }) => `${row.original.recipients.filter((item) => item.existingCommissionId).length} of ${row.original.recipients.length} assigned` },
    ],
    [],
  );
  const fullyAssigned = (sale: EligibleSale) => sale.recipients.every((item) => item.existingCommissionId);
  const viewing = viewingId ? (eligible.data ?? []).find((item) => item.saleId === viewingId) ?? null : null;

  return (
    <AdminPage
      anyOf={["commissions"]}
      title="Commission Assignment"
      description="Assign each seller's commission percentage for a Confirmed Sale."
      crumbs={[{ label: "Finance" }, { label: "Commission Assignment" }]}
      actions={
        <Link href="/admin/commissions" className={buttonVariants({ variant: "outline", className: "tw:min-h-11 tw:sm:min-h-8" })}>
          Commission records
        </Link>
      }
    >
      {canApprove ? (
        <>
          <InfoNote title="No default rates">
            Enter each recipient&apos;s percentage. The system never proposes a rate. Payout opens {PAYOUT_RELEASE_WAIT_DAYS} days after {PAYOUT_RELEASE_THRESHOLD_BP / 100}% of the contract value is Finance-verified.
          </InfoNote>
          <QueryState isLoading={eligible.isLoading} error={eligible.error}>
            <DataTable
              data={eligible.data ?? []}
              columns={columns}
              getRowId={(row) => row.saleId}
              emptyText="No confirmed sales yet."
              caption="Confirmed sales awaiting commission assignment"
              onRowOpen={(row) => setViewingId(row.saleId)}
              getRowLabel={(row) => `Open the sale for ${row.customerName}`}
              rowActions={(row) => (
                <RowActionsMenu
                  itemName={`sale for ${row.customerName}`}
                  onView={() => setViewingId(row.saleId)}
                  extraItems={fullyAssigned(row) ? [] : [{ key: "assign", label: "Assign percentages", onClick: () => setSelected(row) }]}
                />
              )}
            />
          </QueryState>
        </>
      ) : (
        <InfoNote title="Not available">Only authorized Finance personnel assign commission percentages.</InfoNote>
      )}
      {selected ? <AssignDialog sale={selected} onClose={() => setSelected(null)} /> : null}
      <RecordDetailsSheet
        open={viewing !== null}
        onClose={() => setViewingId(null)}
        title={viewing?.customerName ?? "Confirmed sale"}
        subtitle={viewing ? `${viewing.productCode} · confirmed ${formatDate(viewing.confirmedDate)}` : undefined}
        sections={
          viewing
            ? [
                { title: "Sale", rows: [{ label: "Contract value", value: <Money value={viewing.valueCentavos} /> }, { label: "Confirmed", value: formatDate(viewing.confirmedDate) }] },
                { title: "Recipients", rows: viewing.recipients.map((item) => ({ label: `${item.displayName} (${item.designation})`, value: item.existingCommissionId ? "Assigned" : "Not assigned" })) },
              ]
            : []
        }
        footer={
          viewing && !fullyAssigned(viewing) ? (
            <Button
              type="button"
              onClick={() => {
                setSelected(viewing);
                setViewingId(null);
              }}
            >
              Assign percentages
            </Button>
          ) : undefined
        }
      />
    </AdminPage>
  );
}

function AssignDialog({ sale, onClose }: { sale: EligibleSale; onClose: () => void }) {
  const approve = useApproveCommission();
  const free = sale.recipients.filter((item) => !item.existingCommissionId);
  const [picked, setPicked] = useState<Record<string, boolean>>({});
  const [rates, setRates] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | undefined>();

  const preview = (memberId: string): string => {
    const bp = parsePercentToBasisPoints(rates[memberId] ?? "");
    if (bp === null || bp <= 0 || bp > 10_000) return "";
    try {
      return peso.format(applyBasisPoints(sale.valueCentavos, bp) / 100);
    } catch (failure) {
      return failure instanceof MoneyError ? "Needs a rounding policy" : "";
    }
  };

  const send = async () => {
    const entries = free.filter((item) => picked[item.memberId]).map((item) => ({ memberId: item.memberId, percentBp: parsePercentToBasisPoints(rates[item.memberId] ?? "") ?? 0 }));
    if (entries.length === 0) return setError("Select at least one recipient.");
    if (entries.some((entry) => entry.percentBp <= 0)) return setError("Enter a valid percentage for every selected recipient.");
    try {
      await approve.mutateAsync({ saleId: sale.saleId, entries });
      toast.success("Commission assigned.");
      onClose();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not assign.");
    }
  };

  return (
    <FormDialog open title="Assign commission percentages" description={`${sale.customerName} · contract value ${peso.format(sale.valueCentavos / 100)}`} submitText="Assign" pending={approve.isPending} error={error} onClose={onClose} onSubmit={() => void send()}>
      {free.map((recipient) => (
        <div key={recipient.memberId} className="tw:grid tw:grid-cols-1 tw:gap-2 tw:sm:grid-cols-2 tw:sm:items-end">
          <CheckboxField label={`${recipient.displayName} (${recipient.designation})`} checked={Boolean(picked[recipient.memberId])} onChange={(checked) => setPicked((current) => ({ ...current, [recipient.memberId]: checked }))} />
          {picked[recipient.memberId] ? <PercentField label="Percentage" value={rates[recipient.memberId] ?? ""} onChange={(value) => setRates((current) => ({ ...current, [recipient.memberId]: value }))} hint={preview(recipient.memberId) ? `Amount: ${preview(recipient.memberId)}` : "Calculated on the contract value."} /> : null}
        </div>
      ))}
    </FormDialog>
  );
}
