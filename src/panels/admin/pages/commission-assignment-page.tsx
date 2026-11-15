"use client";

import { useMemo, useState } from "react";
import { FilterBar } from "@/shared/components/modern/filter-bar";
import { matchesSearch } from "@/shared/lib/search";
import { toast } from "sonner";
import { useCommissionRates, useOperation, useSaveCommissionRate } from "@/data/business-queries";
import type { CommissionRateDirectory } from "@/data/contracts/commission-repository";
import { COMMISSION_ROLE_LABELS, commissionRoleLabel, type CommissionProduct, type CommissionRole } from "@/modules/commissions/types";
import { formatBasisPoints } from "@/shared/lib/money";
import { DataTable, type ColumnDef } from "@/shared/components/modern/data-table";
import { FormDialog } from "@/shared/components/modern/form-dialog";
import { QueryState } from "@/shared/components/modern/query-state";
import { RecordDetailsSheet } from "@/shared/components/modern/record-details-sheet";
import { Percent } from "lucide-react";
import { SelectField, TextField } from "@/shared/forms/modern";

const columns: ColumnDef<CommissionRateDirectory["rates"][number], unknown>[] = [
  { header: "Seller", cell: ({ row }) => <span className="tw:font-semibold">{row.original.memberName}</span> },
  { header: "Product", accessorKey: "product" },
  { header: "Type", cell: ({ row }) => commissionRoleLabel(row.original.role) },
  { header: "Approved rate", cell: ({ row }) => formatBasisPoints(row.original.rateBp) },
  { header: "Exception", cell: ({ row }) => isException(row.original) ? "Yes" : "—" },
];

type RateRow = CommissionRateDirectory["rates"][number];
const rateKey = (row: RateRow) => `${row.memberId}-${row.product}-${row.role}`;

function isException(row: RateRow): boolean {
  return row.standardRateBp !== null && row.standardRateBp !== row.rateBp;
}

function parseRate(value: string): number | null {
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(value.trim());
  if (!match) return null;
  const rate = Number(match[1]) * 100 + Number(match[2]?.padEnd(2, "0") ?? "0");
  return Number.isSafeInteger(rate) ? rate : null;
}

/** Rates tab (commission.rates.manage). The "Set rate" button lives in the area page actions, which control `editing`. */
export function CommissionRatesPanel({ editing, onEditingChange }: { editing: boolean; onEditingChange: (open: boolean) => void }) {
  const allowed = useOperation("commission.rates.manage");
  const query = useCommissionRates(allowed);
  const [search, setSearch] = useState("");
  const [product, setProduct] = useState("all");
  const [role, setRole] = useState("all");
  const [detailKey, setDetailKey] = useState<string | null>(null);
  const detail = detailKey ? (query.data?.rates ?? []).find((item) => rateKey(item) === detailKey) ?? null : null;
  const rates = useMemo(
    () => (query.data?.rates ?? []).filter((item) => (product === "all" || item.product === product) && (role === "all" || item.role === role) && matchesSearch(search, item.memberName)),
    [query.data, search, product, role],
  );
  return (
    <>
      <FilterBar search={search} onSearch={setSearch} searchLabel="Search sellers" filters={[
        { label: "Product filter", value: product, onChange: setProduct, options: [{ value: "all", label: "All products" }, { value: "VIP", label: "VIP" }, { value: "IGP", label: "IGP" }] },
        { label: "Commission type filter", value: role, onChange: setRole, options: [{ value: "all", label: "All types" }, { value: "DSC", label: COMMISSION_ROLE_LABELS.DSC }, { value: "DRI", label: COMMISSION_ROLE_LABELS.DRI }] },
      ]} />
      <QueryState isLoading={query.isLoading} error={query.error}>
        <DataTable data={rates} columns={columns} caption="Approved seller rates"
          emptyText={(query.data?.rates ?? []).length === 0 ? "No approved rates recorded." : "No rates match the filters."} getRowId={rateKey}
          onRowOpen={(row) => setDetailKey(rateKey(row))} getRowLabel={(row) => `Open rate for ${row.memberName}`} />
      </QueryState>
      <RecordDetailsSheet open={detail !== null} onClose={() => setDetailKey(null)} title={detail ? detail.memberName : "Commission rate"}
        icon={<Percent />}
        sections={detail ? [
          {
            title: "Commission",
            rows: [
              { label: "Product", value: detail.product },
              { label: "Commission type", value: `${commissionRoleLabel(detail.role)} (${detail.role})` },
            ],
          },
          {
            title: "Rate",
            rows: [
              { label: "Approved rate", value: formatBasisPoints(detail.rateBp) },
              { label: "Standard rate", value: detail.standardRateBp === null ? null : formatBasisPoints(detail.standardRateBp) },
              { label: "Exception", value: isException(detail) ? "Yes" : "No" },
            ],
          },
        ] : []} />
      {editing && query.data ? <RateDialog directory={query.data} onClose={() => onEditingChange(false)} /> : null}
    </>
  );
}

function RateDialog({ directory, onClose }: { directory: CommissionRateDirectory; onClose: () => void }) {
  const [memberId, setMemberId] = useState("");
  const [product, setProduct] = useState<CommissionProduct>("VIP");
  const [role, setRole] = useState<CommissionRole>("DSC");
  const [reason, setReason] = useState("");
  const [draft, setDraft] = useState<{ key: string; rate: string; standard: string }>();
  const [error, setError] = useState<string>();
  const save = useSaveCommissionRate();
  const current = directory.rates.find((item) => item.memberId === memberId && item.product === product && item.role === role);
  const key = `${memberId}-${product}-${role}`;
  const values = draft?.key === key ? draft : {
    key,
    rate: current ? String(current.rateBp / 100) : "",
    standard: current?.standardRateBp != null ? String(current.standardRateBp / 100) : "",
  };
  return (
    <FormDialog open title="Set approved commission rate" submitText="Save rate" error={error} pending={save.isPending}
      onClose={onClose} onSubmit={() => {
        const standard = values.standard.trim();
        const standardRateBp = standard ? parseRate(standard) : null;
        const rateBp = values.rate.trim() ? parseRate(values.rate) : standardRateBp;
        if (!memberId || rateBp === null || (standard && standardRateBp === null)) {
          setError("Choose a seller and enter a valid rate. Use 0 for an approved zero.");
          return;
        }
        void save.mutateAsync({ memberId, product, role, rateBp, standardRateBp, reason }).then(() => {
          toast.success("Commission rate saved.");
          onClose();
        }).catch((failure: Error) => setError(failure.message));
      }}>
      <SelectField label="Seller" required value={memberId} onChange={setMemberId}
        options={directory.members.map(({ id, name }) => ({ value: id, label: name }))} />
      <SelectField label="Product" required value={product} onChange={setProduct} options={[{ value: "VIP", label: "VIP" }, { value: "IGP", label: "IGP" }]} />
      <SelectField label="Commission type" required value={role} onChange={setRole} options={[{ value: "DSC", label: COMMISSION_ROLE_LABELS.DSC }, { value: "DRI", label: COMMISSION_ROLE_LABELS.DRI }]} />
      <TextField label="Approved rate (%)" hint="Leave blank to use the approved standard rate." inputMode="decimal" value={values.rate} onChange={(rate) => setDraft({ ...values, rate })} />
      <TextField label="Standard rate (%)" inputMode="decimal" value={values.standard} onChange={(standard) => setDraft({ ...values, standard })} />
      <TextField label="Reason" required value={reason} onChange={setReason} />
    </FormDialog>
  );
}
