"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, ArrowLeftRight, Banknote, CalendarClock, CreditCard, FileUp, Landmark, Pencil, Printer, Receipt, Smartphone, WalletCards, X } from "lucide-react";
import { CustomerValidationError } from "@/data/contracts/customer-repository";
import { useCreateCustomerDraft, useCustomers, useMembers } from "@/data/queries";
import { useOperation, usePaymentSchemes, usePrepareContract, useSubmitCustomer, useSubmitPayment, useVipProducts } from "@/data/business-queries";
import { useDevIdentity } from "@/shared/providers/dev-identity-provider";
import { validateCustomerForSubmit } from "@/modules/customers/rules";
import { PAYMENT_METHODS, type PaymentMethod } from "@/modules/finance/types";
import { downPaymentCentavos, installmentCountFor, schemePriceCentavos } from "@/modules/vip/rules";
import type { PaymentScheme, VipProduct, VipTierCode } from "@/modules/vip/types";
import { manilaToday } from "@/shared/lib/dates";
import { formatPeso } from "@/shared/lib/money";
import { cn } from "@/shared/lib/utils";
import type { RadioCardOption } from "@/shared/components/modern/radio-card-group";
import { StepIndicator } from "@/shared/components/modern/step-indicator";
import { InfoNote } from "@/shared/components/modern/detail-list";
import { CheckboxField, FieldShell, RadioCardField, StandardDateField, TextField, useFieldIds } from "@/shared/forms/modern";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import {
  AddressSection,
  AttributionSection,
  CertificationsSection,
  ContactSection,
  GovernmentIdSection,
  IdentitySection,
  SectionBlock,
  SupplementarySection,
  toDraft,
  toInput,
  type CustomerDraft,
  type CustomerErrors,
  type SetDraft,
} from "../components/customer-form-sections";
import { PlanSummary } from "../components/customer-plan-summary";
import { VipCardChoiceGrid } from "../components/vip-card-choice";
import { useAdminSidebar } from "../layouts/admin-sidebar-context";

const STEPS = ["VIP card", "Payment plan", "Customer", "Sales and consent", "Review", "Reservation"] as const;
const STEP_CARD = 0;
const STEP_PLAN = 1;
const STEP_CUSTOMER = 2;
const STEP_SALES = 3;
const STEP_REVIEW = 4;
const STEP_RESERVATION = 5;

/** Validation keys that belong to each step, so Next only blocks on what the step shows. */
const STEP_KEYS: Record<number, string[]> = {
  [STEP_CARD]: ["vipPlan"],
  [STEP_PLAN]: ["paymentSchemeId", "contractClassification"],
  [STEP_CUSTOMER]: ["firstName", "lastName", "dateOfBirth", "gender", "civilStatus", "mobileNumber", "address", "email"],
  [STEP_SALES]: ["customerNumber", "supplementaryHolder", "consentDataPrivacy", "idReceivedCertified"],
};

const METHOD_ICONS: Record<PaymentMethod, ReactNode> = {
  Cash: <Banknote className="tw:size-4" />,
  "Bank Transfer": <Landmark className="tw:size-4" />,
  GCash: <Smartphone className="tw:size-4" />,
  Maya: <Smartphone className="tw:size-4" />,
  Card: <CreditCard className="tw:size-4" />,
  Cheque: <WalletCards className="tw:size-4" />,
};
const SCHEME_ICONS = { cash: <Banknote className="tw:size-5" />, installment: <CalendarClock className="tw:size-5" />, move: <ArrowLeftRight className="tw:size-5" /> };
const CLASSIFICATION_OPTIONS: RadioCardOption<"S" | "N">[] = [
  { value: "S", label: "Standard (S)", description: "Standard contract terms." },
  { value: "N", label: "Non-Standard (N)", description: "Held at finalization until the rules are approved." },
];

function pick(errors: CustomerErrors, keys: string[]): CustomerErrors {
  const out: CustomerErrors = {};
  for (const key of keys) if (errors[key]) out[key] = errors[key];
  return out;
}

function schemeDescription(scheme: PaymentScheme, tier: VipTierCode | "", product?: VipProduct): string {
  if (scheme.availability !== "available") return "Not available: terms are pending an owner decision.";
  const parts: string[] = [];
  const price = product ? schemePriceCentavos(product, scheme) : null;
  if (price != null) parts.push(`${formatPeso(price)} total`);
  if (scheme.category === "cash") parts.push(scheme.reservationCentavos ? "Balance due within 7 days of the reservation" : "Single full payment");
  const down = price != null ? downPaymentCentavos(price, scheme) : null;
  if (down != null) parts.push(`${formatPeso(down)} down payment including the reservation fee`);
  const count = tier ? installmentCountFor(scheme, tier) : scheme.installmentCount;
  if (scheme.category !== "cash" && count) {
    const monthly = tier ? scheme.installmentCentavosByTier[tier] : undefined;
    parts.push(`${count} monthly installments${monthly ? ` of ${formatPeso(monthly)}` : ""}`);
  }
  parts.push(scheme.reservationCentavos ? `${formatPeso(scheme.reservationCentavos)} reservation fee` : "No reservation fee");
  if (scheme.category === "move") parts.push("Needs Super Admin written approval");
  return parts.join(" · ");
}

function addressLine(draft: CustomerDraft) {
  const a = draft.address;
  return [a.street, a.subdivision, a.barangay, a.city, a.province, a.postalCode].filter(Boolean).join(", ") || "Not provided";
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="tw:flex tw:flex-col tw:gap-0.5">
      <dt className="tw:text-xs tw:font-medium tw:tracking-wide tw:text-muted-foreground tw:uppercase">{label}</dt>
      {value ? <dd className="tw:text-sm tw:font-medium">{value}</dd> : <dd className="tw:text-sm tw:text-muted-foreground">Not provided</dd>}
    </div>
  );
}

function ReviewBlock({ title, onEdit, children }: { title: string; onEdit: () => void; children: ReactNode }) {
  return (
    <SectionBlock
      title={title}
      action={
        <Button type="button" variant="ghost" size="sm" onClick={onEdit} aria-label={`Edit ${title}`}>
          <Pencil aria-hidden="true" className="tw:size-3.5" /> Edit
        </Button>
      }
    >
      <dl className="tw:grid tw:grid-cols-1 tw:gap-x-6 tw:gap-y-4 tw:sm:grid-cols-2">{children}</dl>
    </SectionBlock>
  );
}

export function CustomerApplicationWizard() {
  const router = useRouter();
  const { identity } = useDevIdentity();
  const canManage = useOperation("customers.manage");
  const canPrepare = useOperation("contracts.prepare");
  const canPay = useOperation("payments.submit");
  const products = useVipProducts();
  const schemes = usePaymentSchemes();
  const members = useMembers();
  const customers = useCustomers();
  const create = useCreateCustomerDraft();
  const submitCustomer = useSubmitCustomer();
  const prepare = usePrepareContract();
  const submitPayment = useSubmitPayment();

  const [step, setStep] = useState(STEP_CARD);
  const [draft, setDraft] = useState<CustomerDraft>(() => toDraft());
  const [errors, setErrors] = useState<CustomerErrors>({});
  const [busy, setBusy] = useState(false);
  const [method, setMethod] = useState<PaymentMethod>("Bank Transfer");
  const [paidDate, setPaidDate] = useState(manilaToday());
  const [reference, setReference] = useState("");
  const [proofName, setProofName] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [reservationErrors, setReservationErrors] = useState<Record<string, string | undefined>>({});
  const proofIds = useFieldIds();
  const { collapsed: sidebarCollapsed, setCollapsed: setSidebarCollapsed } = useAdminSidebar();
  const sidebarBefore = useRef<boolean | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const previousStep = useRef(step);
  const [focusTick, setFocusTick] = useState(0);
  const [proofKey, setProofKey] = useState(0);

  // Each new step starts at the top of the form, below the sticky header.
  useEffect(() => {
    if (previousStep.current !== step) rootRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" });
    previousStep.current = step;
  }, [step]);

  // After a failed Continue, move focus to the first invalid field.
  useEffect(() => {
    if (focusTick === 0) return;
    const invalid = rootRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]');
    const target = invalid?.matches('[role="radiogroup"]') ? invalid.querySelector<HTMLElement>('[role="radio"]:not([aria-disabled="true"]):not([data-disabled])') : invalid;
    target?.focus();
    target?.scrollIntoView?.({ behavior: "smooth", block: "center" });
  }, [focusTick]);

  // The sidebar collapses once a card is chosen; leaving the wizard restores what it was.
  useEffect(
    () => () => {
      if (sidebarBefore.current !== null) setSidebarCollapsed(sidebarBefore.current);
    },
    [setSidebarCollapsed],
  );

  const set: SetDraft = (key, value) => setDraft((current) => ({ ...current, [key]: value }));
  const activeProducts = (products.data ?? []).filter((item) => item.status === "active");
  const product = activeProducts.find((item) => item.code === draft.vipPlan);
  const scheme = (schemes.data ?? []).find((item) => item.id === draft.paymentSchemeId);
  const supplementaryAllowed = Boolean(product && product.supplementaryHolders > 0);
  const reservationCentavos = scheme?.reservationCentavos ?? null;
  const osts = (members.data ?? []).filter((member) => member.designation === "OST").map((member) => ({ value: member.id, label: member.displayName }));
  const sellers = (members.data ?? []).map((member) => ({ value: member.id, label: `${member.displayName} (${member.designation})` }));

  if (!canManage) return <InfoNote title="View only">This account cannot create or edit customers.</InfoNote>;

  const allErrors = (): CustomerErrors => validateCustomerForSubmit(toInput(draft), customers.data ?? [], undefined, supplementaryAllowed);

  const choosePlan = (code: VipTierCode) => {
    const next = activeProducts.find((item) => item.code === code);
    const keepScheme = (schemes.data ?? []).some((item) => item.id === draft.paymentSchemeId && item.applicableTiers.includes(code));
    setDraft((current) => ({
      ...current,
      vipPlan: code,
      paymentSchemeId: keepScheme ? current.paymentSchemeId : "",
      ...(next && next.supplementaryHolders > 0 ? {} : { suppFirstName: "", suppMiddleName: "", suppLastName: "", suppGender: "", suppDateOfBirth: "" }),
    }));
    setErrors((current) => ({ ...current, vipPlan: undefined }));
  };

  // Moves to `target`. Going back is always allowed; going forward validates every
  // step on the way and stops at the first one with problems.
  const goTo = (target: number) => {
    if (target <= step) {
      setStep(target);
      return;
    }
    const all = allErrors();
    for (let from = step; from < target; from += 1) {
      const found = pick(all, STEP_KEYS[from] ?? []);
      const blocked = Object.keys(found).length > 0 || (from === STEP_REVIEW && Object.keys(all).length > 0);
      if (blocked) {
        setErrors(found);
        setStep(from);
        toast.error("Complete the highlighted fields to continue.");
        setFocusTick((tick) => tick + 1);
        return;
      }
    }
    setErrors({});
    if (step === STEP_CARD) {
      if (sidebarBefore.current === null) sidebarBefore.current = sidebarCollapsed;
      setSidebarCollapsed(true);
    }
    setStep(target);
  };

  const next = () => goTo(step + 1);

  const saveDraft = async () => {
    const input = toInput(draft);
    if (!input.displayName) {
      toast.error("Enter at least a first or last name to save a draft.");
      return;
    }
    setBusy(true);
    try {
      const saved = await create.mutateAsync(input);
      toast.success("Draft saved.");
      router.push(`/admin/customers/${saved.id}`);
    } catch (failure) {
      toast.error(failure instanceof Error ? failure.message : "Request failed.");
    } finally {
      setBusy(false);
    }
  };

  const submitApplication = async () => {
    const found: Record<string, string | undefined> = {};
    if (canPrepare && !accepted) found.accepted = "Confirm that the customer accepted the payment schedule.";
    if (canPrepare && canPay && reservationCentavos) {
      if (!proofName) found.proof = "Attach the proof of the reservation fee payment.";
      if (paidDate > manilaToday()) found.paidDate = "The payment date cannot be in the future.";
    }
    setReservationErrors(found);
    if (Object.keys(found).length > 0) return;

    const input = toInput(draft);
    setBusy(true);
    let customerId: string | null = null;
    try {
      customerId = (await create.mutateAsync(input)).id;
      try {
        await submitCustomer.mutateAsync({ id: customerId, input });
      } catch (failure) {
        if (failure instanceof CustomerValidationError) {
          router.replace(`/admin/customers/${customerId}/edit`);
          toast.error("The application has incomplete fields. Your draft was kept.");
          return;
        }
        throw failure;
      }
    } catch (failure) {
      toast.error(failure instanceof Error ? failure.message : "Request failed.");
      setBusy(false);
      return;
    }

    try {
      if (canPrepare && scheme) {
        // Due dates derive from the reservation date on the receipt; without a reservation payment, from today.
        const contract = await prepare.mutateAsync({ customerId, schemeId: scheme.id, customerAccepted: accepted, reservationDate: reservationCentavos && canPay ? paidDate : manilaToday() });
        if (reservationCentavos && canPay) {
          await submitPayment.mutateAsync({ contractId: contract.id, purpose: "reservation", amountCentavos: reservationCentavos, method, paidDate, referenceNo: reference || null, evidenceFileName: proofName || null });
          toast.success("Application submitted. The reservation fee is waiting for Finance verification.");
        } else toast.success("Application submitted and contract drafted.");
      } else toast.success("Customer submitted.");
    } catch (failure) {
      toast.error(`The customer was submitted, but the next step failed: ${failure instanceof Error ? failure.message : "Request failed."} Continue from the customer page.`);
    } finally {
      setBusy(false);
    }
    router.push(`/admin/customers/${customerId}`);
  };

  const schemeOptions: RadioCardOption[] = (schemes.data ?? [])
    .filter((item) => draft.vipPlan && item.applicableTiers.includes(draft.vipPlan as VipTierCode))
    .map((item) => ({
      value: item.id,
      label: item.commercialStatus === "configured" ? item.label : `${item.label} (terms pending)`,
      description: schemeDescription(item, draft.vipPlan as VipTierCode, product),
      icon: SCHEME_ICONS[item.category],
      disabled: item.availability !== "available",
    }));

  const reviewErrors = step === STEP_REVIEW ? allErrors() : {};
  const reviewErrorList = Object.values(reviewErrors).filter(Boolean) as string[];

  return (
    <div ref={rootRef} className={cn("customer-application tw:scroll-mt-20 tw:gap-6", step > STEP_CARD ? "tw:grid tw:grid-cols-1 tw:lg:grid-cols-[20rem_minmax(0,1fr)] tw:lg:items-start" : "tw:flex tw:flex-col")}>
      {step > STEP_CARD && product ? <PlanSummary product={product} scheme={scheme} onChange={() => setStep(STEP_CARD)} /> : null}
      <div className="customer-application__main tw:flex tw:min-w-0 tw:flex-col tw:gap-5">
      {step > STEP_CARD ? (
        <>
          <div className="tw:flex tw:flex-col tw:gap-1.5 tw:lg:hidden">
            <p className="tw:text-sm tw:font-medium">
              Step {step + 1} of {STEPS.length} · {STEPS[step]}
            </p>
            <div role="progressbar" aria-label="Application progress" aria-valuemin={1} aria-valuemax={STEPS.length} aria-valuenow={step + 1} className="tw:h-1.5 tw:rounded-full tw:bg-border">
              <div className="tw:h-full tw:rounded-full tw:bg-primary tw:transition-[width] tw:motion-reduce:transition-none" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
            </div>
          </div>
          <StepIndicator steps={STEPS} current={step} onStepClick={goTo} className="tw:hidden tw:lg:flex" />
        </>
      ) : null}

      {step === STEP_CARD ? (
        <section aria-label="Choose a VIP card" className="vip-card-step tw:flex tw:flex-col tw:gap-4">
          <div>
            <div className="vip-card-step__heading tw:flex tw:items-center tw:gap-3">
              <span aria-hidden="true" className="tw:flex tw:size-7 tw:shrink-0 tw:items-center tw:justify-center tw:rounded-full tw:bg-primary tw:text-sm tw:font-semibold tw:text-primary-foreground">
                1
              </span>
              <h2 className="tw:shrink-0 tw:text-lg tw:font-semibold tw:text-primary">Choose a VIP card</h2>
              <span aria-hidden="true" className="tw:h-px tw:flex-1 tw:bg-border" />
            </div>
            <p className="tw:mt-2 tw:text-sm tw:text-muted-foreground">Select the card the customer is applying for. The application form opens after you choose.</p>
          </div>
          {products.isLoading ? (
            <p className="tw:text-sm tw:text-muted-foreground">Loading VIP cards</p>
          ) : (
            <VipCardChoiceGrid products={activeProducts} value={(draft.vipPlan || "") as VipTierCode | ""} onChange={choosePlan} invalid={Boolean(errors.vipPlan)} />
          )}
          {errors.vipPlan ? (
            <p role="alert" className="tw:text-sm tw:text-destructive">
              {errors.vipPlan}
            </p>
          ) : null}
        </section>
      ) : null}

      {step === STEP_PLAN ? (
        <div className="tw:flex tw:flex-col tw:gap-4">
          <SectionBlock title="How the customer pays" description={`How the customer pays for ${product?.name ?? "the card"}.`} icon={<Banknote className="tw:size-4" />}>
            <RadioCardField label="Payment scheme" required variant="card" value={draft.paymentSchemeId || undefined} options={schemeOptions} onChange={(value) => set("paymentSchemeId", value)} error={errors.paymentSchemeId} />
          </SectionBlock>
          <SectionBlock title="Contract terms">
            <RadioCardField label="Contract classification" required value={(draft.contractClassification || undefined) as "S" | "N" | undefined} options={CLASSIFICATION_OPTIONS} onChange={(value) => set("contractClassification", value)} error={errors.contractClassification} />
          </SectionBlock>
        </div>
      ) : null}

      {step === STEP_CUSTOMER ? (
        <div className="tw:flex tw:flex-col tw:gap-4">
          <IdentitySection draft={draft} set={set} errors={errors} />
          <ContactSection draft={draft} set={set} errors={errors} />
          <AddressSection draft={draft} set={set} errors={errors} />
          <GovernmentIdSection draft={draft} set={set} errors={errors} />
        </div>
      ) : null}

      {step === STEP_SALES ? (
        <div className="tw:flex tw:flex-col tw:gap-4">
          {supplementaryAllowed ? <SupplementarySection draft={draft} set={set} errors={errors} /> : null}
          <AttributionSection draft={draft} set={set} errors={errors} osts={osts} sellers={sellers} showOwner={!identity.memberId} />
          <CertificationsSection draft={draft} set={set} errors={errors} />
        </div>
      ) : null}

      {step === STEP_REVIEW ? (
        <div className="tw:flex tw:flex-col tw:gap-4">
          <div>
            <h2 className="tw:text-lg tw:font-semibold">Review the application</h2>
            <p className="tw:text-sm tw:text-muted-foreground">Check every detail before continuing. Use Edit to change a section.</p>
          </div>
          {reviewErrorList.length > 0 ? (
            <InfoNote title="Fix these before continuing">
              <ul className="tw:list-disc tw:pl-5">{reviewErrorList.map((message) => <li key={message}>{message}</li>)}</ul>
            </InfoNote>
          ) : null}
          <ReviewBlock title="VIP card and payment plan" onEdit={() => setStep(STEP_CARD)}>
            <Row label="VIP card" value={product ? `${product.name} (${product.code})` : ""} />
            <Row label="Price" value={product ? formatPeso(product.priceCentavos) : ""} />
            <Row label="Payment scheme" value={scheme?.label} />
            <Row label="Contract classification" value={draft.contractClassification === "N" ? "Non-Standard (N)" : draft.contractClassification === "S" ? "Standard (S)" : ""} />
          </ReviewBlock>
          <ReviewBlock title="Customer" onEdit={() => setStep(STEP_CUSTOMER)}>
            <Row label="Name" value={[draft.firstName, draft.noMiddleName ? "" : draft.middleName, draft.lastName, draft.suffix].filter(Boolean).join(" ")} />
            <Row label="Gender" value={draft.gender} />
            <Row label="Civil status" value={draft.civilStatus} />
            <Row label="Date of birth" value={draft.dateOfBirth} />
            <Row label="Mobile number" value={draft.mobileNumber} />
            <Row label="Email" value={draft.email} />
            <Row label="Address" value={addressLine(draft)} />
            <Row label="Government ID" value={[draft.governmentIdType, draft.governmentIdNumber].filter(Boolean).join(" · ")} />
          </ReviewBlock>
          <ReviewBlock title="Sales and consent" onEdit={() => setStep(STEP_SALES)}>
            {supplementaryAllowed ? <Row label="Supplementary holder" value={[draft.suppFirstName, draft.suppMiddleName, draft.suppLastName].filter(Boolean).join(" ")} /> : null}
            <Row label="Recommender" value={osts.find((item) => item.value === draft.recommenderMemberId)?.label} />
            <Row label="Acquisition channel" value={draft.acquisitionChannel} />
            <Row label="Customer ID" value={draft.customerNumber} />
            <Row label="Data privacy consent" value={draft.consentDataPrivacy ? "Certified" : "Not certified"} />
            <Row label="Government ID received" value={draft.idReceivedCertified ? "Certified" : "Not certified"} />
          </ReviewBlock>
        </div>
      ) : null}

      {step === STEP_RESERVATION ? (
        <div className="tw:flex tw:flex-col tw:gap-4">
          <SectionBlock title="Application form" description="Generated from the details you entered. Print it for the customer to sign, and keep it with the proof of payment." icon={<Receipt className="tw:size-4" />}>
            <div className="customer-application__sheet tw:flex tw:flex-col tw:gap-4 tw:rounded-xl tw:border tw:border-dashed tw:border-input tw:bg-muted/40 tw:p-5">
              <div className="tw:flex tw:items-baseline tw:justify-between tw:gap-3 tw:border-b tw:border-border tw:pb-3">
                <span className="tw:text-sm tw:font-semibold tw:tracking-tight">AFhomes VIP Application Form</span>
                <span className="tw:text-xs tw:text-muted-foreground">Prepared {manilaToday()}</span>
              </div>
              <dl className="tw:grid tw:grid-cols-1 tw:gap-x-6 tw:gap-y-4 tw:sm:grid-cols-2">
                <Row label="Customer ID" value={draft.customerNumber || "Assigned on submission"} />
                <Row label="Applicant" value={[draft.firstName, draft.noMiddleName ? "" : draft.middleName, draft.lastName, draft.suffix].filter(Boolean).join(" ")} />
                <Row label="Mobile number" value={draft.mobileNumber} />
                <Row label="VIP card" value={product ? `${product.name} (${product.code}) · ${formatPeso(product.priceCentavos)}` : ""} />
                <Row label="Payment scheme" value={scheme?.label} />
                <Row label="Reservation fee" value={reservationCentavos ? formatPeso(reservationCentavos) : "None for this scheme"} />
                <div className="tw:sm:col-span-2">
                  <Row label="Address" value={addressLine(draft)} />
                </div>
              </dl>
            </div>
            <div>
              <Button type="button" variant="outline" size="sm" onClick={() => window.print()}>
                <Printer aria-hidden="true" className="tw:size-4" /> Print application form
              </Button>
            </div>
          </SectionBlock>

          {!canPrepare ? (
            <InfoNote title="Submitting the customer only">This account cannot prepare contracts. The application is submitted for a seller or staff member to continue.</InfoNote>
          ) : (
            <SectionBlock title="Reservation fee and proof" description={reservationCentavos ? `Submit the ${formatPeso(reservationCentavos)} reservation fee with its proof. Finance verifies it before the sale moves on.` : "This payment scheme has no reservation fee. The contract is drafted without a payment."} icon={<Banknote className="tw:size-4" />}>
              {reservationCentavos && canPay ? (
                <>
                  <RadioCardField label="Payment method" required value={method} options={PAYMENT_METHODS.map((value) => ({ value, label: value, icon: METHOD_ICONS[value] }))} onChange={setMethod} />
                  <div className="tw:grid tw:grid-cols-1 tw:gap-3 tw:sm:grid-cols-2">
                    <StandardDateField label="Date on the receipt" required value={paidDate} onChange={setPaidDate} error={reservationErrors.paidDate} />
                    <TextField label="Receipt or reference number" value={reference} onChange={setReference} hint="Enter it exactly as printed. Never guess a receipt number." />
                  </div>
                  <FieldShell ids={proofIds} label="Proof of payment" required error={reservationErrors.proof} hint="Only the file name is kept in this prototype.">
                    <div className="tw:flex tw:items-stretch tw:gap-2">
                      <input key={proofKey} id={proofIds.id} type="file" accept="image/*,application/pdf" aria-invalid={Boolean(reservationErrors.proof) || undefined} className="tw:peer tw:sr-only" onChange={(event) => setProofName(event.target.files?.[0]?.name ?? "")} />
                      <label
                        htmlFor={proofIds.id}
                        className={cn(
                          "customer-application__upload tw:flex tw:min-w-0 tw:flex-1 tw:cursor-pointer tw:items-center tw:gap-3 tw:rounded-xl tw:border-2 tw:border-dashed tw:bg-card tw:p-4 tw:transition-colors tw:hover:border-primary/60 tw:hover:bg-primary/5 tw:peer-focus-visible:ring-3 tw:peer-focus-visible:ring-ring/40",
                          reservationErrors.proof ? "tw:border-destructive" : proofName ? "tw:border-primary tw:bg-primary/5" : "tw:border-input",
                        )}
                      >
                        <span aria-hidden="true" className="tw:flex tw:size-10 tw:shrink-0 tw:items-center tw:justify-center tw:rounded-full tw:bg-secondary tw:text-primary">
                          <FileUp className="tw:size-5" />
                        </span>
                        <span className="tw:flex tw:min-w-0 tw:flex-col">
                          <span className="tw:truncate tw:text-sm tw:font-medium">{proofName || "Choose a file"}</span>
                          <span className="tw:text-xs tw:text-muted-foreground">{proofName ? "Click to replace" : "Image or PDF"}</span>
                        </span>
                      </label>
                      {proofName ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          aria-label="Remove file"
                          onClick={() => {
                            setProofName("");
                            setProofKey((key) => key + 1);
                          }}
                        >
                          <X aria-hidden="true" />
                        </Button>
                      ) : null}
                    </div>
                  </FieldShell>
                </>
              ) : reservationCentavos ? (
                <InfoNote title="Payment not available">This account cannot submit payments. Submit the reservation fee from the contract page after the application.</InfoNote>
              ) : null}
              <CheckboxField variant="card" label="The customer reviewed and accepted the payment schedule." checked={accepted} onChange={setAccepted} error={reservationErrors.accepted} />
            </SectionBlock>
          )}
        </div>
      ) : null}

      <Card className="customer-application__actions tw:sticky tw:bottom-2 tw:z-10 tw:flex-col-reverse tw:gap-2 tw:p-3 tw:shadow-md tw:sm:flex-row tw:sm:items-center tw:sm:justify-between tw:lg:static tw:lg:shadow-none">
        <div className="tw:flex tw:gap-2">
          <Button type="button" variant="outline" disabled={busy} className="tw:min-h-11 tw:flex-1 tw:sm:min-h-8 tw:sm:flex-none" onClick={() => (step === STEP_CARD ? router.back() : setStep(step - 1))}>
            {step === STEP_CARD ? "Cancel" : (<><ArrowLeft aria-hidden="true" className="tw:size-4" /> Back</>)}
          </Button>
          {step > STEP_CARD ? (
            <Button type="button" variant="outline" disabled={busy} className="tw:min-h-11 tw:flex-1 tw:sm:min-h-8 tw:sm:flex-none" onClick={() => void saveDraft()}>
              Save as draft
            </Button>
          ) : null}
        </div>
        {step > STEP_CARD ? <span className="tw:hidden tw:text-sm tw:text-muted-foreground tw:lg:inline">Step {step + 1} of {STEPS.length}</span> : null}
        {step < STEP_RESERVATION ? (
          <Button type="button" disabled={busy || (step === STEP_CARD && !draft.vipPlan) || (step === STEP_REVIEW && reviewErrorList.length > 0)} className="tw:min-h-11 tw:sm:min-h-8" onClick={next}>
            Continue <ArrowRight aria-hidden="true" className="tw:size-4" />
          </Button>
        ) : (
          <Button type="button" disabled={busy} className="tw:min-h-11 tw:sm:min-h-8" onClick={() => void submitApplication()}>
            Submit application
          </Button>
        )}
      </Card>
      </div>
    </div>
  );
}
