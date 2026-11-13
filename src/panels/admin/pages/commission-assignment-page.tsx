"use client";

import { useMemo, useState } from "react";
import { FilterBar } from "@/shared/components/modern/filter-bar";
import { matchesSearch } from "@/shared/lib/search";
import { toast } from "sonner";
import { useCommissionRates, useOperation, useSaveCommissionRate } from "@/data/business-queries";
import type { CommissionRateDirectory } from "@/data/contracts/commission-repository";
import type { CommissionProduct, CommissionRole } from "@/modules/commissions/types";
import { formatBasisPoints } from "@/shared/lib/money";
import { AdminPage } from "@/shared/components/admin";
import { DataTable, type ColumnDef } from "@/shared/components/modern/data-table";
import { FormDialog } from "@/shared/components/modern/form-dialog";
import { QueryState } from "@/shared/components/modern/query-state";
import { SelectField, TextField } from "@/shared/forms/modern";
import { Button } from "@/shared/ui/button";

const columns: ColumnDef<CommissionRateDirectory["rates"][number], unknown>[] = [
  { header: "Seller", accessorKey: "memberName" },
  { header: "Product", accessorKey: "product" },
  { header: "Type", accessorKey: "role" },
  { header: "Approved rate", cell: ({ row }) => formatBasisPoints(row.original.rateBp) },
  { header: "Standard rate", cell: ({ row }) => row.original.standardRateBp === null ? "Not recorded" : formatBasisPoints(row.original.standardRateBp) },
  { header: "Exception", cell: ({ row }) => row.original.standardRateBp !== null && row.original.standardRateBp !== row.original.rateBp ? "Yes" : "—" },
];

function parseRate(value: string): number | null {
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(value.trim());
  if (!match) return null;
  const rate = Number(match[1]) * 100 + Number(match[2]?.padEnd(2, "0") ?? "0");
  return Number.isSafeInteger(rate) ? rate : null;
}

export function CommissionAssignmentPage() {
  const allowed = useOperation("commission.rates.manage");
  const query = useCommissionRates(allowed);
  const [editing, setEditing] = useState(false);
  const [search, setSearch] = useState("");
  const [product, setProduct] = useState("all");
  const [role, setRole] = useState("all");
  const rates = useMemo(
    () => (query.data?.rates ?? []).filter((item) => (product === "all" || item.product === product) && (role === "all" || item.role === role) && matchesSearch(search, item.memberName)),
    [query.data, search, product, role],
  );
  return (
    <AdminPage anyOf={["commissions"]} allowed={allowed} title="Commission Rates"
      description="Set the approved rate for a seller. Issued numbers keep their original rates."
      crumbs={[{ label: "Commissions", href: "/admin/commissions" }, { label: "Commission Rates" }]}
      actions={<Button type="button" disabled={!query.data} onClick={() => setEditing(true)}>Set rate</Button>}>
      <FilterBar search={search} onSearch={setSearch} searchLabel="Search sellers" filters={[
        { label: "Product filter", value: product, onChange: setProduct, options: [{ value: "all", label: "All products" }, { value: "VIP", label: "VIP" }, { value: "IGP", label: "IGP" }] },
        { label: "Commission type filter", value: role, onChange: setRole, options: [{ value: "all", label: "All types" }, { value: "DSC", label: "Closing seller (DSC)" }, { value: "DRI", label: "Referrer (DRI)" }] },
      ]} />
      <QueryState isLoading={query.isLoading} error={query.error}>
        <DataTable data={rates} columns={columns} caption="Approved seller rates"
          emptyText={(query.data?.rates ?? []).length === 0 ? "No approved rates recorded." : "No rates match the filters."} getRowId={(row) => `${row.memberId}-${row.product}-${row.role}`} />
      </QueryState>
      {editing && query.data ? <RateDialog directory={query.data} onClose={() => setEditing(false)} /> : null}
    </AdminPage>
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
        const rateBp = parseRate(values.rate);
        const standard = values.standard.trim();
        const standardRateBp = standard ? parseRate(standard) : null;
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
      <SelectField label="Commission type" required value={role} onChange={setRole} options={[{ value: "DSC", label: "Closing seller (DSC)" }, { value: "DRI", label: "Referrer (DRI)" }]} />
      <TextField label="Approved rate (%)" required inputMode="decimal" value={values.rate} onChange={(rate) => setDraft({ ...values, rate })} />
      <TextField label="Standard rate (%)" inputMode="decimal" value={values.standard} onChange={(standard) => setDraft({ ...values, standard })} />
      <TextField label="Reason" required value={reason} onChange={setReason} />
    </FormDialog>
  );
}
