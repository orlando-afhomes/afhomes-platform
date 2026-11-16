"use client";

import { useMemo, useState } from "react";
import { FilterBar } from "@/shared/components/modern/filter-bar";
import { matchesSearch } from "@/shared/lib/search";
import { toast } from "sonner";
import { useApplyVipPositionRate, useCommissionRates, useOperation, useSales, useSaveCommissionRate } from "@/data/business-queries";
import type { CommissionRateDirectory } from "@/data/contracts/commission-repository";
import { useIgpRegister } from "@/data/igp-queries";
import { parseCommissionRate } from "@/modules/commissions/rules";
import { COMMISSION_ROLE_LABELS, commissionRoleLabel, type CommissionProduct, type CommissionRole } from "@/modules/commissions/types";
import { formatDate } from "@/shared/lib/format-date";
import { formatBasisPoints } from "@/shared/lib/money";
import { DataTable, type ColumnDef } from "@/shared/components/modern/data-table";
import { FormDialog } from "@/shared/components/modern/form-dialog";
import { QueryState } from "@/shared/components/modern/query-state";
import { RecordDetailsSheet } from "@/shared/components/modern/record-details-sheet";
import { Percent } from "lucide-react";
import { CheckboxField, SelectField, TextField } from "@/shared/forms/modern";
import { Button } from "@/shared/ui/button";
import { CommissionPositionRateSettings } from "./commission-position-rate-settings";

const columns: ColumnDef<CommissionRateDirectory["rates"][number], unknown>[] = [
  { header: "Seller", cell: ({ row }) => <span className="tw:font-semibold">{row.original.memberName}</span> },
  { header: "Product", accessorKey: "product" },
  { header: "Type", cell: ({ row }) => commissionRoleLabel(row.original.role) },
  { header: "Approved rate", cell: ({ row }) => formatBasisPoints(row.original.rateBp) },
  { header: "Exception", cell: ({ row }) => isException(row.original) ? "Yes" : "—" },
];

type RateRow = CommissionRateDirectory["rates"][number];
export type RateSaleContext = { saleId: string; role: CommissionRole };
type RateSale = {
  id: string;
  customerId: string;
  customerName: string;
  label: string;
  product: CommissionProduct;
  sellerMemberId: string | null;
  referrerMemberId: string | null;
};
const rateKey = (row: RateRow) => `${row.memberId}-${row.product}-${row.role}`;

function isException(row: RateRow): boolean {
  return row.standardRateBp !== null && row.standardRateBp !== row.rateBp;
}

/** Rates tab (commission.rates.manage). The "Set rate" button lives in the area page actions, which control `editing`. */
export function CommissionRatesPanel({ editing, onEditingChange, saleContext }: {
  editing: boolean;
  onEditingChange: (open: boolean) => void;
  saleContext?: RateSaleContext;
}) {
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
      {allowed && query.data ? <CommissionPositionRateSettings rates={query.data.positionRates} /> : null}
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
      {allowed && editing && query.data ? (
        <RateDialog key={saleContext ? `${saleContext.saleId}:${saleContext.role}` : "direct"}
          directory={query.data} onClose={() => onEditingChange(false)} saleContext={saleContext} />
      ) : null}
    </>
  );
}

function RateDialog({ directory, onClose, saleContext }: {
  directory: CommissionRateDirectory;
  onClose: () => void;
  saleContext?: RateSaleContext;
}) {
  const vip = useSales();
  const igp = useIgpRegister(true);
  const [customerChoice, setCustomerChoice] = useState<string>();
  const [saleChoice, setSaleChoice] = useState<string>();
  const [directSeller, setDirectSeller] = useState("");
  const [directProduct, setDirectProduct] = useState<CommissionProduct>("VIP");
  const [role, setRole] = useState<CommissionRole>(saleContext?.role ?? "DSC");
  const [reason, setReason] = useState("");
  const [draft, setDraft] = useState<{ key: string; rate: string; standard: string }>();
  const [error, setError] = useState<string>();
  const [manual, setManual] = useState(false);
  const [termsReference, setTermsReference] = useState("");
  const [confirmedKey, setConfirmedKey] = useState("");
  const save = useSaveCommissionRate();
  const apply = useApplyVipPositionRate();
  const sales = useMemo<RateSale[]>(() => [
    ...(vip.data ?? []).filter((sale) => sale.status !== "cancelled" && sale.status !== "rejected").map((sale) => ({
      id: sale.id,
      customerId: sale.customerId,
      customerName: sale.customerName,
      label: `VIP ${sale.productCode} · ${sale.schemeLabel} · ${formatDate(sale.recordedDate)} · Contract ${sale.contractId}`,
      product: "VIP" as const,
      sellerMemberId: sale.sellerMemberId,
      referrerMemberId: sale.referrerMemberId,
    })),
    ...(igp.data?.sales ?? []).filter((sale) => sale.status !== "cancelled" && sale.status !== "replaced").map((sale) => ({
      id: sale.id,
      customerId: sale.customerId,
      customerName: sale.buyerName,
      label: `IGP · ${sale.seriesNumber} · ${formatDate(sale.date)}`,
      product: "IGP" as const,
      sellerMemberId: sale.sellerMemberId,
      referrerMemberId: sale.referrerMemberId,
    })),
  ], [vip.data, igp.data]);
  const customers = [...new Map(sales.map((sale) => [sale.customerId, sale.customerName]))]
    .map(([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label));
  const readingLink = Boolean(saleContext) && customerChoice === undefined;
  const linkedSale = readingLink ? sales.find((sale) => sale.id === saleContext?.saleId && sale.product === "VIP") : undefined;
  const customerId = customerChoice ?? linkedSale?.customerId ?? "";
  const customerSales = sales.filter((sale) => sale.customerId === customerId);
  const selectedSale = linkedSale ?? (saleChoice
    ? customerSales.find((sale) => sale.id === saleChoice)
    : customerSales.length === 1 ? customerSales[0] : undefined);
  const fromSale = Boolean(customerId) || readingLink;
  const product = fromSale ? selectedSale?.product : directProduct;
  const fromSaleSeller = role === "DSC" ? selectedSale?.sellerMemberId : selectedSale?.referrerMemberId;
  const memberId = fromSale ? directory.members.find((member) => member.id === fromSaleSeller)?.id ?? "" : directSeller;
  const loadingSales = vip.isLoading || igp.isLoading;
  const resetRateFields = () => {
    setDraft(undefined);
    setReason("");
    setError(undefined);
    setManual(false);
    setTermsReference("");
    setConfirmedKey("");
  };
  const current = directory.rates.find((item) => item.memberId === memberId && item.product === product && item.role === role);
  const designation = directory.members.find((member) => member.id === memberId)?.designation;
  const positionRate = product === "VIP" && !current
    ? directory.positionRates.find((rate) => rate.designation === designation && rate.role === role)
    : undefined;
  const useStandard = Boolean(positionRate) && !manual;
  const key = `${memberId}-${product}-${role}`;
  const confirmationKey = JSON.stringify([key, positionRate, termsReference.trim()]);
  const values = draft?.key === key ? draft : {
    key,
    rate: current ? String(current.rateBp / 100) : "",
    standard: current?.standardRateBp != null ? String(current.standardRateBp / 100) : "",
  };
  return (
    <FormDialog open title="Set approved commission rate"
      description="Saving updates this seller’s rate for future number issuances."
      submitText="Save rate" error={error} pending={save.isPending || apply.isPending}
      onClose={onClose} onSubmit={() => {
        if (fromSale && !selectedSale) {
          setError("Choose a sale for this customer, or set the rate directly for a seller.");
          return;
        }
        if (useStandard && positionRate) {
          if (!termsReference.trim() || confirmedKey !== confirmationKey) {
            setError("Enter the service terms reference and confirm that the approved rate applies.");
            return;
          }
          void apply.mutateAsync({ memberId, standard: positionRate, serviceTermsReference: termsReference }).then(() => {
            toast.success("Approved VIP rate applied to seller.");
            onClose();
          }).catch((failure: Error) => setError(failure.message));
          return;
        }
        const standard = values.standard.trim();
        const standardRateBp = standard ? parseCommissionRate(standard) : null;
        const rateBp = values.rate.trim() ? parseCommissionRate(values.rate) : standardRateBp;
        if (fromSale && !memberId) {
          setError(`This sale has no available ${role === "DSC" ? "closing seller" : "referrer"} to set a rate for.`);
          return;
        }
        if (!memberId || !product || rateBp === null || (standard && standardRateBp === null)) {
          setError("Choose a seller and enter a valid rate. Use 0 for an approved zero.");
          return;
        }
        void save.mutateAsync({ memberId, product, role, rateBp, standardRateBp, reason }).then(() => {
          toast.success("Commission rate saved.");
          onClose();
        }).catch((failure: Error) => setError(failure.message));
      }}>
      <SelectField label="Customer" value={customerId} options={customers} allowClear clearLabel="Set rate directly for a seller"
        loading={loadingSales} placeholder="Search by customer name"
        hint="Optional. Select a customer to find the seller on an existing sale."
        error={readingLink && !linkedSale && !loadingSales ? "This sale could not be opened. Select a customer or set the rate directly." : undefined}
        onChange={(value) => {
          setCustomerChoice(value);
          setSaleChoice(undefined);
          setRole("DSC");
          resetRateFields();
        }} />
      {customerId ? (
        <SelectField label="Sale" required value={selectedSale?.id ?? ""} disabled={customerSales.length === 1}
          options={customerSales.map((sale) => ({ value: sale.id, label: sale.label }))}
          onChange={(value) => {
            setSaleChoice(value);
            setCustomerChoice(customerId);
            setRole("DSC");
            resetRateFields();
          }} />
      ) : null}
      <SelectField label="Seller" required value={memberId} disabled={fromSale} onChange={(value) => {
        setDirectSeller(value);
        resetRateFields();
      }}
        options={directory.members.map(({ id, name }) => ({ value: id, label: name }))} />
      <SelectField label="Product" required value={product} disabled={fromSale} onChange={(value) => {
        setDirectProduct(value);
        resetRateFields();
      }} options={[{ value: "VIP", label: "VIP" }, { value: "IGP", label: "IGP" }]} />
      <SelectField label="Commission type" required value={role} onChange={(value) => {
        setRole(value);
        resetRateFields();
      }} options={[{ value: "DSC", label: COMMISSION_ROLE_LABELS.DSC }, { value: "DRI", label: COMMISSION_ROLE_LABELS.DRI, disabled: fromSale && !selectedSale?.referrerMemberId }]} />
      {useStandard && positionRate ? (
        <>
          <div className="tw:rounded-lg tw:border tw:bg-muted tw:p-3 tw:text-sm">
            <p className="tw:font-semibold">Approved VIP standard: {formatBasisPoints(positionRate.rateBp)}</p>
            <p className="tw:wrap-break-word tw:text-muted-foreground">Approval reference: {positionRate.approvalReference}</p>
          </div>
          <TextField label="Seller's service terms reference" required value={termsReference} onChange={setTermsReference} />
          <CheckboxField label="I confirm the seller’s approved service terms use this rate." checked={confirmedKey === confirmationKey}
            onChange={(checked) => setConfirmedKey(checked ? confirmationKey : "")} />
        </>
      ) : (
        <>
          <TextField label="Approved rate (%)" hint="Leave blank to use the approved standard rate." inputMode="decimal" value={values.rate} onChange={(rate) => setDraft({ ...values, rate })} />
          <TextField label="Standard rate (%)" inputMode="decimal" value={values.standard} onChange={(standard) => setDraft({ ...values, standard })} />
          <TextField label="Reason" value={reason} onChange={setReason} />
        </>
      )}
      {positionRate ? <div><Button type="button" variant="outline" onClick={() => {
        resetRateFields();
        setManual(useStandard);
      }}>{useStandard ? "Enter a seller-specific rate" : "Use the approved VIP standard"}</Button></div> : null}
    </FormDialog>
  );
}
