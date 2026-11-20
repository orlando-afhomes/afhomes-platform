"use client";

import { useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import type { IgpAction, IgpRegister, IgpSaleView } from "@/data/contracts/igp-repository";
import { usePayments } from "@/data/business-queries";
import { useIgpCatalog } from "@/data/igp-catalog-queries";
import { useIgpAction } from "@/data/igp-queries";
import { PAYMENT_METHODS, type PaymentMethod } from "@/modules/finance/types";
import { nextOfficialReceiptNo } from "@/modules/finance/payment-reference";
import { IGP_DOCUMENT_LABELS, JAD_PREFIXES, buildJadNumber, defaultJadPrefix, jadNumberProblem, jadYearMonth, type JadPrefix } from "@/modules/igp/rules";
import type { IgpClauses, IgpDocumentKey, IgpEntry, IgpScheme } from "@/modules/igp/types";
import type { ConfirmTone } from "@/shared/components/modern/app-alert";
import { FormDialog } from "@/shared/components/modern/form-dialog";
import { MoneyField, PercentField, SelectField, StandardDateField, TextAreaField, TextField } from "@/shared/forms/modern";
import { manilaToday } from "@/shared/lib/dates";
import { parsePesoToCentavos } from "@/shared/lib/money";

function IgpForm({ title, submitText, submitVariant, description, build, onClose, children }: {
  title: string; submitText: string; submitVariant?: ConfirmTone; description?: string; build: () => IgpAction; onClose: () => void; children: ReactNode;
}) {
  const mutation = useIgpAction();
  const [error, setError] = useState<string>();
  const submit = async () => {
    try {
      await mutation.mutateAsync(build());
      toast.success("Property sale (IGP) record saved.");
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save the property sale (IGP) record.");
    }
  };
  return (
    <FormDialog open title={title} description={description} submitText={submitText} submitVariant={submitVariant} pending={mutation.isPending} error={error} onClose={onClose} onSubmit={() => void submit()}>
      {children}
    </FormDialog>
  );
}

export function IgpSaleDialog({ register, sale, mode, onClose }: {
  register: IgpRegister; sale?: IgpSaleView; mode: "record" | "reissue" | "correct"; onClose: () => void;
}) {
  const [buyer, setBuyer] = useState("");
  const [projectId, setProjectId] = useState(sale?.projectId ?? "");
  const [unitId, setUnitId] = useState(sale?.unitId ?? "");
  const [price, setPrice] = useState(sale ? String(sale.priceCentavos / 100) : "");
  const [scheme, setScheme] = useState<IgpScheme>(sale?.scheme ?? "T");
  const [term, setTerm] = useState(sale ? String(sale.termMonths) : "");
  const [clauses, setClauses] = useState<IgpClauses>(sale?.clauses ?? "S");
  const [entry, setEntry] = useState<IgpEntry>("reservation");
  const [date, setDate] = useState(manilaToday);
  const [seller, setSeller] = useState(sale?.sellerMemberId ?? "");
  const [referrer, setReferrer] = useState(sale?.referrerMemberId ?? "");
  const [referralReference, setReferralReference] = useState(sale?.referralReference ?? "");
  const [paidDate, setPaidDate] = useState(manilaToday);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("Cash");
  const [documentNo, setDocumentNo] = useState("");
  const [reason, setReason] = useState("");
  const payments = usePayments();
  // Cash receipts get the system-issued OR number; the field is disabled and previews it.
  const receiptDate = entry === "reservation" ? date : paidDate;
  const autoDocumentNo = mode === "record" && method === "Cash" ? nextOfficialReceiptNo(payments.data ?? [], receiptDate) : "";
  const title = { record: "Record property sale (IGP)", reissue: "Reissue Series Number", correct: "Correct property sale (IGP)" }[mode];
  const sellers = register.sellers.filter(({ value }) => register.accreditations.some(({ memberId }) => value === memberId));
  // Same-team rule: each picker follows the other party's team (owner instruction 2026-11-20).
  const closingOptions = useMemo(() => {
    const branch = mode === "record" ? sellers.find((sellerOption) => sellerOption.value === referrer)?.branchId : undefined;
    return branch ? sellers.filter((sellerOption) => sellerOption.branchId === branch) : sellers;
  }, [sellers, referrer, mode]);
  const referrerOptions = useMemo(() => {
    const branch = sellers.find((sellerOption) => sellerOption.value === (mode === "record" ? seller : sale?.sellerMemberId))?.branchId;
    return branch ? sellers.filter((sellerOption) => sellerOption.branchId === branch) : sellers;
  }, [sellers, seller, mode, sale]);
  const catalog = useIgpCatalog(mode !== "correct");
  const projectOptions = useMemo(() => {
    const options = (catalog.data?.projects ?? []).filter(({ status, id }) => status === "active" || id === sale?.projectId)
      .map(({ id, name, status }) => ({ value: id, label: status === "active" ? name : `${name} (inactive)` }));
    // An inactive project the sale already holds stays visible, labelled.
    return sale && !options.some(({ value }) => value === sale.projectId) ? [...options, { value: sale.projectId, label: `${sale.project} (inactive)` }] : options;
  }, [catalog.data, sale]);
  const unitRecords = useMemo(() => {
    const options = (catalog.data?.units ?? []).filter(({ projectId: owner, status, id }) => owner === projectId && (status === "active" || id === sale?.unitId))
      .map(({ id, unitOrLot, status, propertyOwner }) => ({ value: id, label: status === "active" ? unitOrLot : `${unitOrLot} (inactive)`, propertyOwner }));
    return sale && projectId === sale.projectId && !options.some(({ value }) => value === sale.unitId)
      ? [...options, { value: sale.unitId, label: `${sale.unit} (inactive)`, propertyOwner: sale.propertyOwner }] : options;
  }, [catalog.data, projectId, sale]);
  const propertyOwner = unitRecords.find(({ value }) => value === unitId)?.propertyOwner ?? "";
  const build = (): IgpAction => {
    const priceCentavos = parsePesoToCentavos(price) ?? 0;
    if (mode === "correct" && sale) return { type: "correct", id: sale.id, input: { priceCentavos, referrerMemberId: referrer || null, referralReference, reason } };
    const terms = { projectId, unitId, priceCentavos, scheme, termMonths: scheme === "C" ? 1 : Number(term), clauses, date };
    if (mode === "reissue" && sale) return { type: "reissue", id: sale.id, input: { ...terms, reason } };
    return {
      type: "record",
      input: {
        ...terms, customerId: buyer, sellerMemberId: seller, referrerMemberId: referrer || null, referralReference, entry,
        payment: { amountCentavos: parsePesoToCentavos(amount) ?? 0, method, paidDate: entry === "reservation" ? date : paidDate, documentNo: method === "Cash" ? autoDocumentNo : documentNo.trim() || null },
      },
    };
  };
  return (
    <IgpForm title={title} submitText={title} submitVariant={mode === "record" ? "default" : "warning"} description={mode === "reissue" ? "The old number stays in history. Its receipts move to the new number." : undefined} build={build} onClose={onClose}>
      {mode === "record" && <SelectField label="Buyer" value={buyer} options={register.buyers} required onChange={setBuyer} />}
      {mode !== "correct" && <>
        <SelectField label="Project" value={projectId} options={projectOptions} required loading={catalog.isLoading} onChange={(value) => { setProjectId(value); setUnitId(""); }} />
        <SelectField label="Unit or lot" value={unitId} options={unitRecords} required disabled={!projectId} onChange={setUnitId} />
        <TextField label="Property owner" value={propertyOwner} disabled placeholder="—" hint="Filled in from the unit or lot you choose." onChange={() => undefined} />
      </>}
      <MoneyField label="Total contract price" value={price} required onChange={setPrice} />
      {mode !== "correct" && <>
        <SelectField label="Payment plan" value={scheme} options={[{ value: "C", label: "Cash" }, { value: "T", label: "Terms" }]} onChange={(value) => { setScheme(value); if (value === "C") setEntry("reservation"); }} />
        {scheme === "T" && <TextField label="Term in months" value={term} inputMode="numeric" required onChange={setTerm} />}
        <SelectField label="Contract type" value={clauses} options={[{ value: "S", label: "Standard" }, { value: "N", label: "Non-Standard" }]} onChange={setClauses} />
      </>}
      {mode === "record" && <SelectField label="Closing seller" value={seller} options={closingOptions} required onChange={(value) => { setSeller(value); if (referrer && referrerOptions.length > 0 && !referrerOptions.some((option) => option.value === referrer)) setReferrer(""); }} />}
      {mode !== "reissue" && <SelectField label="Referrer" value={referrer} options={referrerOptions} allowClear onChange={(value) => { setReferrer(value); if (seller && value && closingOptions.length > 0 && !closingOptions.some((option) => option.value === seller)) setSeller(""); }} />}
      {mode !== "reissue" && seller && seller === referrer && <TextField label="Verified referral reference" value={referralReference} required onChange={setReferralReference} />}
      {mode === "record" && scheme === "T" && <SelectField label="Issue at" value={entry} options={[{ value: "reservation", label: "Reservation fee payment" }, { value: "cts", label: "Contract to Sell signing" }]} onChange={setEntry} />}
      {mode !== "correct" && <StandardDateField label={mode === "reissue" ? "New issue date" : entry === "cts" ? "Contract to Sell signing date" : "Reservation payment date"} value={date} required onChange={setDate} />}
      {mode === "record" && <>
        {entry === "cts" && <StandardDateField label="Down payment receipt date" value={paidDate} required onChange={setPaidDate} />}
        <MoneyField label={entry === "cts" ? "Down payment amount" : "Reservation amount"} value={amount} required onChange={setAmount} />
        <SelectField label="Payment method" value={method} options={PAYMENT_METHODS.map((value) => ({ value, label: value }))} onChange={setMethod} />
        <TextField
          label="Invoice / Receipt number"
          value={method === "Cash" ? autoDocumentNo : documentNo}
          onChange={setDocumentNo}
          disabled={method === "Cash"}
          maxLength={40}
          hint={method === "Cash"
            ? "Generated by the system for cash receipts (OR-YYYYMMDD-NNNN). Finance sees this number when it reviews the payment."
            : "Number of the Invoice, Official Receipt, or Collection Receipt issued for this collection."}
        />
      </>}
      {mode !== "record" && <TextAreaField label="Reason" value={reason} required onChange={setReason} />}
    </IgpForm>
  );
}

export function IgpSettingsDialog({ register, mode, onClose }: {
  register: IgpRegister; mode: "accredit" | "threshold"; onClose: () => void;
}) {
  const [seller, setSeller] = useState("");
  const [prefixChoice, setPrefixChoice] = useState<JadPrefix | "">("");
  const [lastDigits, setLastDigits] = useState("");
  const [date, setDate] = useState(manilaToday);
  const [threshold, setThreshold] = useState(String(register.thresholdBp / 100));
  const [reason, setReason] = useState("");
  const title = mode === "accredit" ? "Record JA&D accreditation" : "When does a property sale (IGP) count?";
  // The type starts from the seller's designation (IST: JAI, OST: JAO); staff can change it.
  const prefix = prefixChoice || defaultJadPrefix(register.sellers.find(({ value }) => value === seller)?.designation);
  const yearMonth = jadYearMonth(date);
  const number = lastDigits.length === 4 && prefix && yearMonth ? buildJadNumber({ prefix, approvedDate: date, sequence: lastDigits }) : null;
  const problem = number ? (register.accreditations.some((record) => record.number === number)
    ? "This JA&D number is already on another accreditation. Check the number on the JA&D paper." : jadNumberProblem(number, date)) : null;
  return (
    <IgpForm title={title} submitText="Save" onClose={onClose}
      build={() => mode === "accredit"
        ? { type: "accredit", memberId: seller, number: buildJadNumber({ prefix, approvedDate: date, sequence: lastDigits }), approvedDate: date }
        : { type: "threshold", basisPoints: parsePesoToCentavos(threshold) ?? 0, reason }}>
      {mode === "accredit" ? <>
        <SelectField label="Seller" value={seller} options={register.sellers} required onChange={setSeller} />
        <SelectField label="Accreditation type" value={prefix} options={JAD_PREFIXES} required onChange={setPrefixChoice} />
        <StandardDateField label="JA&D approval date" value={date} required onChange={setDate} />
        <TextField label="Last 4 digits from the JA&D paper" value={lastDigits} required inputMode="numeric" maxLength={4}
          addonBefore={`${prefix || "JA?"}${yearMonth ?? "????"}`} placeholder="0001"
          hint="The year and month fill in from the approval date. JA&D issues the last 4 digits; type them exactly as written."
          onChange={(value) => setLastDigits(value.replace(/\D/g, "").slice(0, 4))} />
        <p aria-live="polite" className={`tw:m-0 tw:text-sm ${problem ? "tw:text-destructive" : "tw:text-muted-foreground"}`}>
          {`Number: ${number ?? `${prefix || "JA?"}${yearMonth ?? "????"}${lastDigits.padEnd(4, "_")}`}`}{problem ? `. ${problem}` : ""}
        </p>
      </> : <>
        <PercentField label="Percent of contract price collected" value={threshold} required hint={`Currently ${register.thresholdBp / 100}%. This applies only to sales recorded after you save.`} onChange={setThreshold} />
        <TextAreaField label="Reason for the change" value={reason} required onChange={setReason} />
      </>}
    </IgpForm>
  );
}

export function IgpRecordDetailDialog({ sale, mode, documentKey, onClose }: {
  sale: IgpSaleView; mode: "cancel" | "default" | "document"; documentKey?: IgpDocumentKey; onClose: () => void;
}) {
  const document = sale.documents.find(({ key }) => key === documentKey);
  const [reason, setReason] = useState("");
  const [amount, setAmount] = useState("0");
  const [date, setDate] = useState(document?.signedDate ?? (mode === "document" ? manilaToday() : ""));
  const [signers, setSigners] = useState(document?.signers ?? "");
  const title = mode === "document" && document ? IGP_DOCUMENT_LABELS[document.key].name : mode === "cancel" ? "Cancel property sale (IGP)" : "Mark property sale (IGP) as stopped paying";
  const build = (): IgpAction => {
    if (mode === "document" && document) return { type: "document", id: sale.id, key: document.key, signedDate: date, signers };
    if (mode === "default") return { type: "default", id: sale.id, reason };
    return { type: "cancel", id: sale.id, reason, refundCentavos: parsePesoToCentavos(amount) ?? -1, refundDate: date || null };
  };
  return (
    <IgpForm title={title} submitText={mode === "document" ? "Save Document Details" : title} submitVariant={mode === "cancel" ? "destructive" : mode === "default" ? "warning" : "default"} build={build} onClose={onClose}
      description={mode === "cancel" ? "Enter the refund decided by JA&D or the Property Owner." : undefined}>
      {mode === "document" && document ? <>
        <StandardDateField label="Signature date" value={date} required onChange={setDate} />
        <TextField label="Signers" value={signers} required hint={`Expected signer: ${IGP_DOCUMENT_LABELS[document.key].signedBy}`} onChange={setSigners} />
      </> : <>
        {mode === "cancel" && <>
          <MoneyField label="Refund amount" value={amount} required onChange={setAmount} />
          <StandardDateField label="Refund date" value={date} onChange={setDate} />
        </>}
        <TextAreaField label="Reason" value={reason} required onChange={setReason} />
      </>}
    </IgpForm>
  );
}
