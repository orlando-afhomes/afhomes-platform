"use client";

import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import type { IgpAction, IgpRegister, IgpSaleView } from "@/data/contracts/igp-repository";
import { useIgpAction } from "@/data/igp-queries";
import { PAYMENT_METHODS, type PaymentMethod } from "@/modules/finance/types";
import { IGP_DOCUMENT_LABELS } from "@/modules/igp/rules";
import type { IgpClauses, IgpDocumentKey, IgpEntry, IgpScheme } from "@/modules/igp/types";
import { FormDialog } from "@/shared/components/modern/form-dialog";
import { MoneyField, PercentField, SelectField, StandardDateField, TextAreaField, TextField } from "@/shared/forms/modern";
import { cleanReferenceNumber, referencePolicyFor, validateReferenceNumber } from "@/shared/forms/validation/reference-number";
import { manilaToday } from "@/shared/lib/dates";
import { parsePesoToCentavos } from "@/shared/lib/money";

function IgpForm({ title, submitText, description, build, onClose, children }: {
  title: string; submitText: string; description?: string; build: () => IgpAction; onClose: () => void; children: ReactNode;
}) {
  const mutation = useIgpAction();
  const [error, setError] = useState<string>();
  const submit = async () => {
    try {
      await mutation.mutateAsync(build());
      toast.success("IGP record saved.");
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save the IGP record.");
    }
  };
  return (
    <FormDialog open title={title} description={description} submitText={submitText} pending={mutation.isPending} error={error} onClose={onClose} onSubmit={() => void submit()}>
      {children}
    </FormDialog>
  );
}

export function IgpSaleDialog({ register, sale, mode, onClose }: {
  register: IgpRegister; sale?: IgpSaleView; mode: "record" | "reissue" | "correct"; onClose: () => void;
}) {
  const [buyer, setBuyer] = useState("");
  const [project, setProject] = useState(sale?.project ?? "");
  const [unit, setUnit] = useState(sale?.unit ?? "");
  const [propertyOwner, setPropertyOwner] = useState(sale?.propertyOwner ?? "");
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
  const [reference, setReference] = useState("");
  const [reason, setReason] = useState("");
  const title = { record: "Record IGP sale", reissue: "Reissue Series Number", correct: "Correct IGP sale" }[mode];
  const sellers = register.sellers.filter(({ value }) => register.accreditations.some(({ memberId }) => value === memberId));
  const build = (): IgpAction => {
    const priceCentavos = parsePesoToCentavos(price) ?? 0;
    if (mode === "correct" && sale) return { type: "correct", id: sale.id, input: { priceCentavos, referrerMemberId: referrer || null, referralReference, reason } };
    const terms = { project, unit, propertyOwner, priceCentavos, scheme, termMonths: scheme === "C" ? 1 : Number(term), clauses, date };
    if (mode === "reissue" && sale) return { type: "reissue", id: sale.id, input: { ...terms, reason } };
    const referenceError = validateReferenceNumber(reference, referencePolicyFor(method));
    if (!reference.trim() || referenceError) throw new Error(referenceError ?? "Enter the receipt or reference number.");
    return {
      type: "record",
      input: {
        ...terms, customerId: buyer, sellerMemberId: seller, referrerMemberId: referrer || null, referralReference, entry,
        payment: { amountCentavos: parsePesoToCentavos(amount) ?? 0, method, paidDate: entry === "reservation" ? date : paidDate, referenceNo: reference },
      },
    };
  };
  return (
    <IgpForm title={title} submitText={title} description={mode === "reissue" ? "The old number stays in history. Its receipts move to the new number." : undefined} build={build} onClose={onClose}>
      {mode === "record" && <SelectField label="Buyer" value={buyer} options={register.buyers} required onChange={setBuyer} />}
      {mode !== "correct" && <>
        <TextField label="Project" value={project} required onChange={setProject} />
        <TextField label="Unit or lot" value={unit} required onChange={setUnit} />
        <TextField label="Property owner" value={propertyOwner} required onChange={setPropertyOwner} />
      </>}
      <MoneyField label="Total contract price" value={price} required onChange={setPrice} />
      {mode !== "correct" && <>
        <SelectField label="Payment plan" value={scheme} options={[{ value: "C", label: "Cash" }, { value: "T", label: "Terms" }]} onChange={(value) => { setScheme(value); if (value === "C") setEntry("reservation"); }} />
        {scheme === "T" && <TextField label="Term in months" value={term} inputMode="numeric" required onChange={setTerm} />}
        <SelectField label="Clause classification" value={clauses} options={[{ value: "S", label: "Standard" }, { value: "N", label: "Non-Standard" }]} onChange={setClauses} />
      </>}
      {mode === "record" && <SelectField label="Closing seller" value={seller} options={sellers} required onChange={setSeller} />}
      {mode !== "reissue" && <SelectField label="Referrer" value={referrer} options={sellers} allowClear onChange={setReferrer} />}
      {mode !== "reissue" && seller && seller === referrer && <TextField label="Verified referral reference" value={referralReference} required onChange={setReferralReference} />}
      {mode === "record" && scheme === "T" && <SelectField label="Issue at" value={entry} options={[{ value: "reservation", label: "Reservation fee payment" }, { value: "cts", label: "Contract to Sell signing" }]} onChange={setEntry} />}
      {mode !== "correct" && <StandardDateField label={mode === "reissue" ? "New issue date" : entry === "cts" ? "Contract to Sell signing date" : "Reservation payment date"} value={date} required onChange={setDate} />}
      {mode === "record" && <>
        {entry === "cts" && <StandardDateField label="Down payment receipt date" value={paidDate} required onChange={setPaidDate} />}
        <MoneyField label={entry === "cts" ? "Down payment amount" : "Reservation amount"} value={amount} required onChange={setAmount} />
        <SelectField label="Payment method" value={method} options={PAYMENT_METHODS.map((value) => ({ value, label: value }))} onChange={(value) => { setMethod(value); setReference(cleanReferenceNumber(reference, referencePolicyFor(value))); }} />
        <TextField label="Receipt or reference number" value={reference} required onChange={(value) => setReference(cleanReferenceNumber(value, referencePolicyFor(method)))} />
      </>}
      {mode !== "record" && <TextAreaField label="Reason" value={reason} required onChange={setReason} />}
    </IgpForm>
  );
}

export function IgpSettingsDialog({ register, mode, onClose }: {
  register: IgpRegister; mode: "accredit" | "threshold"; onClose: () => void;
}) {
  const [seller, setSeller] = useState("");
  const [number, setNumber] = useState("");
  const [date, setDate] = useState(manilaToday);
  const [threshold, setThreshold] = useState(String(register.thresholdBp / 100));
  const [reason, setReason] = useState("");
  const title = mode === "accredit" ? "Record JA&D accreditation" : "Change Closed Deal threshold";
  return (
    <IgpForm title={title} submitText="Save" onClose={onClose}
      description={mode === "threshold" ? "The new threshold applies to numbers issued after this change." : "Use the number and approval date issued by JA&D."}
      build={() => mode === "accredit" ? { type: "accredit", memberId: seller, number, approvedDate: date } : { type: "threshold", basisPoints: parsePesoToCentavos(threshold) ?? 0, reason }}>
      {mode === "accredit" ? <>
        <SelectField label="Seller" value={seller} options={register.sellers} required onChange={setSeller} />
        <TextField label="JA&D number" value={number} required onChange={setNumber} />
        <StandardDateField label="JA&D approval date" value={date} required onChange={setDate} />
      </> : <>
        <PercentField label="Closed Deal threshold" value={threshold} required onChange={setThreshold} />
        <TextAreaField label="Reason" value={reason} required onChange={setReason} />
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
  const title = mode === "document" && document ? IGP_DOCUMENT_LABELS[document.key].name : mode === "cancel" ? "Cancel IGP sale" : "Mark IGP sale defaulted";
  const build = (): IgpAction => {
    if (mode === "document" && document) return { type: "document", id: sale.id, key: document.key, signedDate: date, signers };
    if (mode === "default") return { type: "default", id: sale.id, reason };
    return { type: "cancel", id: sale.id, reason, refundCentavos: parsePesoToCentavos(amount) ?? -1, refundDate: date || null };
  };
  return (
    <IgpForm title={title} submitText={mode === "document" ? "Save document details" : title} build={build} onClose={onClose}
      description={mode === "cancel" ? "Record the refund amount decided by JA&D or the Property Owner. The Series Number stays in the register." : undefined}>
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
