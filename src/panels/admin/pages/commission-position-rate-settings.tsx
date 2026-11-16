"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useSaveVipPositionRate } from "@/data/business-queries";
import { parseCommissionRate } from "@/modules/commissions/rules";
import { COMMISSION_ROLE_LABELS, type CommissionRole, type VipPositionRate } from "@/modules/commissions/types";
import type { Designation } from "@/modules/organization/types";
import { DataTable, type ColumnDef } from "@/shared/components/modern/data-table";
import { FormDialog } from "@/shared/components/modern/form-dialog";
import { SelectField, TextField } from "@/shared/forms/modern";
import { formatBasisPoints } from "@/shared/lib/money";
import { Button } from "@/shared/ui/button";

const POSITIONS: Designation[] = ["SVD", "SSM", "SM", "OST"];
const COMMISSION_TYPES = Object.entries(COMMISSION_ROLE_LABELS).map(([value, label]) => ({ value, label }));
const columns: ColumnDef<VipPositionRate, unknown>[] = [
  { header: "Position", accessorKey: "designation" },
  { header: "Commission type", cell: ({ row }) => COMMISSION_ROLE_LABELS[row.original.role] },
  { header: "Approved standard", cell: ({ row }) => formatBasisPoints(row.original.rateBp) },
  { header: "Approval reference", accessorKey: "approvalReference" },
];

export function CommissionPositionRateSettings({ rates }: { rates: VipPositionRate[] }) {
  const [editing, setEditing] = useState(false);

  return (
    <section className="tw:space-y-3" aria-labelledby="commission-position-rates-heading">
      <div className="tw:flex tw:flex-wrap tw:items-center tw:justify-between tw:gap-3">
        <div>
          <h2 id="commission-position-rates-heading" className="tw:text-lg tw:font-semibold">VIP position rates</h2>
          <p className="tw:text-sm tw:text-muted-foreground">Save a company-approved standard, then apply it to sellers whose service terms use it.</p>
        </div>

        <Button type="button" variant="outline" onClick={() => setEditing(true)}>Set VIP standard</Button>
      </div>
      <DataTable data={rates} columns={columns} caption="Approved VIP position rates"
        emptyText="No approved VIP position rates recorded." getRowId={(row) => `${row.designation}-${row.role}`} showAllRows />
      {editing ? <SetPositionRateDialog rates={rates} onClose={() => setEditing(false)} /> : null}
    </section>
  );
}

function SetPositionRateDialog({ rates, onClose }: { rates: VipPositionRate[]; onClose: () => void }) {
  const save = useSaveVipPositionRate();
  const [designation, setDesignation] = useState<Designation | "">("");
  const [role, setRole] = useState<CommissionRole>("DSC");
  const [rate, setRate] = useState("");
  const [approvalReference, setApprovalReference] = useState("");
  const [error, setError] = useState<string>();
  const current = rates.find((item) => item.designation === designation && item.role === role);

  return (
    <FormDialog open title="Set approved VIP standard" submitText="Save standard" pending={save.isPending} error={error} onClose={onClose}
      onSubmit={() => {
        const rateBp = parseCommissionRate(rate);
        if (!designation || rateBp === null || !approvalReference.trim()) {
          setError("Choose a position, enter the approved rate, and enter its approval reference.");
          return;
        }
        void save.mutateAsync({ designation, role, rateBp, approvalReference }).then(() => {
          toast.success("VIP standard saved.");
          onClose();
        }).catch((failure: Error) => setError(failure.message));
      }}>
      <SelectField label="Seller position" required value={designation} onChange={(value) => setDesignation(value as Designation)}
        options={POSITIONS.map((position) => ({ value: position, label: position }))} />
      <SelectField label="Commission type" required value={role} onChange={(value) => setRole(value as CommissionRole)} options={COMMISSION_TYPES} />
      {current ? <p className="tw:text-sm tw:text-muted-foreground">Current standard {formatBasisPoints(current.rateBp)}. Changes apply to later adoptions.</p> : null}
      <TextField label="Approved standard (%)" required inputMode="decimal" value={rate} onChange={setRate} />
      <TextField label="Approval reference" required value={approvalReference} onChange={setApprovalReference} />
    </FormDialog>
  );
}
