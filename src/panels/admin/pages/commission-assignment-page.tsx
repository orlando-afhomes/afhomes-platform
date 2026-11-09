"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useApproveCommission, useEligibleSales, useOperation } from "@/data/business-queries";
import type { EligibleSale } from "@/data/contracts/commission-repository";
import { applyBasisPoints, MoneyError, parsePercentToBasisPoints } from "@/shared/lib/money";
import { DataTable, type ColumnDef } from "@/shared/components/modern/data-table";
import { InfoNote } from "@/shared/components/modern/detail-list";
import { CheckboxField, PercentField } from "@/shared/forms/modern";
import { Button, buttonVariants } from "@/shared/ui/button";
import { FormDialog } from "@/shared/components/modern/form-dialog";
import { Money } from "@/shared/components/modern/money";
import { QueryState } from "@/shared/components/modern/query-state";
import { Section } from "@/shared/components/modern/section";
import { formatDate } from "@/shared/lib/format-date";
import { ModulePage } from "../components/module-page";

const peso = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });

/**
 * Commission Assignment (owner ruling 2026-11-09): Finance manually enters the
 * percentage for each seller of a Confirmed Sale. No default rate exists (08 section 9.1).
 */
export function CommissionAssignmentPage() {
  const canApprove = useOperation("commission.approve");
  const eligible = useEligibleSales(canApprove);
  const [selected, setSelected] = useState<EligibleSale | null>(null);

  const columns = useMemo<ColumnDef<EligibleSale, unknown>[]>(
    () => [
      { id: "customer", header: "Customer", cell: ({ row }) => <span className="tw:font-semibold">{row.original.customerName}</span> },
      { id: "plan", header: "Plan", meta: { className: "tw:hidden tw:sm:table-cell" }, cell: ({ row }) => row.original.productCode },
      { id: "value", header: "Contract value", cell: ({ row }) => <Money value={row.original.valueCentavos} /> },
      { id: "confirmed", header: "Confirmed", meta: { className: "tw:hidden tw:md:table-cell" }, cell: ({ row }) => formatDate(row.original.confirmedDate) },
      { id: "recipients", header: "Recipients", meta: { className: "tw:hidden tw:md:table-cell" }, cell: ({ row }) => `${row.original.recipients.filter((item) => item.existingCommissionId).length} of ${row.original.recipients.length} assigned` },
      {
        id: "actions",
        header: () => <span className="tw:sr-only">Actions</span>,
        cell: ({ row }) => (
          <Button size="sm" className="tw:min-h-11 tw:sm:min-h-7" disabled={row.original.recipients.every((item) => item.existingCommissionId)} onClick={() => setSelected(row.original)}>
            Assign percentages
          </Button>
        ),
      },
    ],
    [],
  );

  return (
    <ModulePage
      anyOf={["commissions"]}
      title="Commission Assignment"
      description="Assign each seller's commission percentage for a Confirmed Sale."
      crumbs={[{ label: "Commissions", href: "/admin/commissions" }, { label: "Commission Assignment" }]}
      actions={
        <Link href="/admin/commissions" className={buttonVariants({ variant: "outline", className: "tw:min-h-11 tw:sm:min-h-8" })}>
          Commission records
        </Link>
      }
    >
      {canApprove ? (
        <>
          <InfoNote title="No default rates">
            Enter each recipient&apos;s percentage. The system never proposes a rate. Payout opens 7 days after 40% of the contract value is Finance-verified.
          </InfoNote>
          <Section title="Confirmed sales" description="Recipients come from the genealogy recorded at the time of sale.">
            <QueryState isLoading={eligible.isLoading} error={eligible.error}>
              <DataTable data={eligible.data ?? []} columns={columns} getRowId={(row) => row.saleId} emptyText="No confirmed sales yet." caption="Confirmed sales awaiting commission assignment" />
            </QueryState>
          </Section>
        </>
      ) : (
        <InfoNote title="Not available">Only authorized Finance personnel assign commission percentages.</InfoNote>
      )}
      {selected ? <AssignDialog sale={selected} onClose={() => setSelected(null)} /> : null}
    </ModulePage>
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
