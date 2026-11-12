"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, ArrowLeftRight, Banknote, CalendarClock, CreditCard, FileText, FileUp, Landmark, Layers, Pencil, Printer, Receipt, ShieldCheck, Smartphone, TriangleAlert, WalletCards, X } from "lucide-react";
import Swal from "sweetalert2";
import { CustomerValidationError } from "@/data/contracts/customer-repository";
import { useAccreditations, useCreateCustomerDraft, useCustomers, useMembers } from "@/data/queries";
import type { Customer } from "@/modules/customers/types";
import { useCorrectCustomer, useOperation, usePaymentSchemes, useRegisterCustomer, useUpdateCustomerDraft, useVipProducts } from "@/data/business-queries";
import { customerAttributionErrors, pendingAttributionMemberIds } from "@/modules/customers/attribution";
import { validateCustomerForSubmit } from "@/modules/customers/rules";
import { PAYMENT_METHODS, type PaymentMethod } from "@/modules/finance/types";
import { applicablePriceStatus, displayPriceFor } from "@/modules/vip/pricing";
import type { VipTierCode } from "@/modules/vip/types";
import { manilaToday } from "@/shared/lib/dates";
import { formatPeso } from "@/shared/lib/money";
import { cn } from "@/shared/lib/utils";
import type { RadioCardOption } from "@/shared/components/modern/radio-card-group";
import { StepIndicator } from "@/shared/components/modern/step-indicator";
import { InfoNote } from "@/shared/components/modern/detail-list";
import { CardGridSkeleton } from "@/shared/components/modern/skeletons";
import { CheckboxField, FieldShell, RadioCardField, StandardDateField, TextField, describedBy, useFieldIds } from "@/shared/forms/modern";
import { REFERENCE_LIMITS, cleanReferenceNumber, referencePolicyFor, validateReferenceNumber, type ReferencePolicy } from "@/shared/forms/validation/reference-number";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { AppAlert, appAlertOptions } from "@/shared/components/modern/app-alert";
import {
  AddressSection,
  AttributionSection,
  CertificationsSection,
  ContactSection,
  EmploymentSection,
  GovernmentIdSection,
  IdentitySection,
  SecondaryHolderSection,
  SecondaryHolderToggle,
  SectionBlock,
  toDraft,
  toInput,
  type CustomerDraft,
  type CustomerErrors,
  type SetDraft,
} from "../components/customer-form-sections";
import { PlanSummary } from "../components/customer-plan-summary";
import { useCustomerIdImagePreview } from "../components/customer-id-image-preview";
import { useNewCustomerExit } from "../components/use-new-customer-exit";
import { ReasonDialog } from "@/shared/components/modern/form-dialog";
import { PaymentOptionGrid, type PaymentOption } from "../components/payment-option-card";
import { schemeCardContent } from "../components/scheme-card-content";
import { VipCardChoiceGrid } from "../components/vip-card-choice";
import { useAdminSidebar } from "../layouts/admin-sidebar-context";

const STEPS = ["VIP card", "Payment plan", "Customer", "Sales and consent", "Reservation", "Review"] as const;
const STEP_CARD = 0;
const STEP_PLAN = 1;
const STEP_CUSTOMER = 2;
const STEP_SALES = 3;
const STEP_RESERVATION = 4;
const STEP_REVIEW = 5;
const SUBMISSION_SUCCESS_DURATION_MS = 3_000;
const SUBMISSION_FEEDBACK = {
  "customer-submitted": {
    toast: "Customer submitted.",
    description: "The customer record is ready to view.",
  },
  "contract-prepared": {
    toast: "Application submitted and contract drafted.",
    description: "The contract was saved as a draft.",
  },
  "reservation-submitted": {
    toast: "Application submitted. The reservation fee is waiting for Finance verification.",
    description: "The reservation fee is awaiting Finance verification.",
  },
};

/** Validation keys that belong to each step, so Next only blocks on what the step shows. */
const STEP_KEYS: Record<number, string[]> = {
  [STEP_CARD]: ["vipPlan"],
  [STEP_PLAN]: ["paymentSchemeId", "contractClassification"],
  [STEP_CUSTOMER]: ["firstName", "lastName", "dateOfBirth", "gender", "civilStatus", "mobileNumber", "address", "email", "citizenship", "tinNumber", "landline", "governmentIdNumber", "supplementaryHolder"],
  [STEP_SALES]: ["recommenderMemberId", "referrerMemberId", "customerNumber", "consentDataPrivacy", "idReceivedCertified"],
};

const LEGACY_WIZARD_STORAGE_KEY = "afhomes.customer-wizard.v1";
const EMPTY_DRAFT = JSON.stringify(toDraft());
const DEFAULT_PAYMENT_METHOD: PaymentMethod = "Bank Transfer";

const METHOD_ICONS: Record<PaymentMethod, ReactNode> = {
  Cash: <Banknote className="tw:size-4" />,
  "Bank Transfer": <Landmark className="tw:size-4" />,
  GCash: <Smartphone className="tw:size-4" />,
  Maya: <Smartphone className="tw:size-4" />,
  Card: <CreditCard className="tw:size-4" />,
  Cheque: <WalletCards className="tw:size-4" />,
};
const SCHEME_ICONS = { cash: <Banknote className="tw:size-5" />, installment: <CalendarClock className="tw:size-5" />, move: <ArrowLeftRight className="tw:size-5" /> };

/** Per-policy guidance for the receipt/reference field. */
function referenceHint(policy: ReferencePolicy): string {
  if (policy === "digital") return "12-16 letters or digits, uppercase; no spaces or symbols.";
  if (policy === "bank") return "6-20 letters or digits, uppercase; no spaces or symbols.";
  return "Letters, digits, spaces, and , . / - only.";
}

const CLASSIFICATION_OPTIONS: RadioCardOption<"S" | "N">[] = [
  { value: "S", label: "Standard (S)", description: "Standard contract terms.", icon: <Layers className="tw:size-4" /> },
  { value: "N", label: "Non-Standard (N)", description: "Held at finalization until the rules are approved.", icon: <ShieldCheck className="tw:size-4" /> },
];

function pick(errors: CustomerErrors, keys: string[]): CustomerErrors {
  const out: CustomerErrors = {};
  for (const key of keys) if (errors[key]) out[key] = errors[key];
  return out;
}

function addressLine(draft: CustomerDraft) {
  const a = draft.address;
  return [a.street, a.barangay, a.city, a.province, a.postalCode].filter(Boolean).join(", ") || "Not provided";
}

function PriceConflictNote() {
  return (
    <p className="customer-application__price-warning tw:flex tw:items-start tw:gap-1.5 tw:rounded-md tw:border tw:border-warning/30 tw:bg-warning/10 tw:p-2 tw:text-xs tw:leading-snug">
      <TriangleAlert aria-hidden="true" className="tw:mt-0.5 tw:size-3.5 tw:shrink-0 tw:text-warning" />
      <span>Price under review: the contract sources disagree. Contract finalization stays on hold until the owner decides.</span>
    </p>
  );
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

export function CustomerApplicationWizard({ existing }: { existing?: Customer } = {}) {
  const router = useRouter();
  const canManage = useOperation("customers.manage");
  const canPrepare = useOperation("contracts.prepare");
  const canPay = useOperation("payments.submit");
  const products = useVipProducts();
  const schemes = usePaymentSchemes();
  const members = useMembers();
  const accreditations = useAccreditations();
  const customers = useCustomers();
  const create = useCreateCustomerDraft();
  const updateDraft = useUpdateCustomerDraft();
  const correct = useCorrectCustomer();
  const register = useRegisterCustomer();
  const primaryIdPreview = useCustomerIdImagePreview();
  const secondaryIdPreview = useCustomerIdImagePreview();

  const [step, setStep] = useState(STEP_CARD);
  const [draft, setDraft] = useState<CustomerDraft>(() => toDraft(existing));
  const [correcting, setCorrecting] = useState(false);
  const isSubmitted = existing != null && existing.status !== "draft";
  const pendingOstIds = useMemo(() => {
    if (isSubmitted) return new Set<string>();
    if (!accreditations.isSuccess || accreditations.isFetching) return null;
    return pendingAttributionMemberIds(accreditations.data);
  }, [isSubmitted, accreditations.isSuccess, accreditations.isFetching, accreditations.data]);
  const [errors, setErrors] = useState<CustomerErrors>({});
  const [saving, setBusy] = useState(false);
  const [action, setAction] = useState<"draft" | "submit">("submit");
  const [submissionSuccess, setSubmissionSuccess] = useState<string | null>(null);
  const busy = saving || submissionSuccess !== null;

  useEffect(() => {
    if (!submissionSuccess) return;
    let active = true;
    const returnToCustomers = () => {
      if (!active) return;
      active = false;
      router.replace("/admin/customers");
    };
    const alert = Swal.fire({
      icon: "success",
      title: "Application submitted",
      text: submissionSuccess,
      timer: SUBMISSION_SUCCESS_DURATION_MS,
      timerProgressBar: true,
      confirmButtonText: "Go to Customers",
      ...appAlertOptions(),
      allowOutsideClick: false,
      allowEscapeKey: false,
      returnFocus: false,
      willClose: () => { Swal.stopTimer(); },
      didClose: returnToCustomers,
    });
    const popup = Swal.getPopup();
    void alert.then(() => undefined).catch(() => {
      if (!active) return;
      toast.success(`Application submitted. ${submissionSuccess}`);
      returnToCustomers();
    });
    return () => {
      active = false;
      if (popup && Swal.getPopup() === popup) Swal.close();
    };
  }, [submissionSuccess, router]);

  const [method, setMethod] = useState<PaymentMethod>(DEFAULT_PAYMENT_METHOD);
  const [initialPaidDate] = useState(manilaToday);
  const [paidDate, setPaidDate] = useState(initialPaidDate);
  const [reference, setReference] = useState("");
  const [referenceTouched, setReferenceTouched] = useState(false);
  const [proofName, setProofName] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [reservationErrors, setReservationErrors] = useState<Record<string, string | undefined>>({});
  const proofIds = useFieldIds();
  const schemeIds = useFieldIds();
  const classificationIds = useFieldIds();
  const { collapsed: sidebarCollapsed, setCollapsed: setSidebarCollapsed } = useAdminSidebar();
  const sidebarBefore = useRef<boolean | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const previousStep = useRef(step);
  const [focusTick, setFocusTick] = useState(0);
  const [proofKey, setProofKey] = useState(0);

  useEffect(() => {
    if (existing) return;
    try {
      sessionStorage.removeItem(LEGACY_WIZARD_STORAGE_KEY);
    } catch {
      // Storage may be unavailable.
    }
  }, [existing]);

  const hasReservationChanges = method !== DEFAULT_PAYMENT_METHOD || paidDate !== initialPaidDate || Boolean(reference || proofName || accepted);
  const hasIdPreview = Boolean(primaryIdPreview.value || secondaryIdPreview.value);
  const exit = useNewCustomerExit({
    enabled: !existing && !submissionSuccess,
    dirty: JSON.stringify(draft) !== EMPTY_DRAFT || hasReservationChanges || hasIdPreview,
    busy,
    navigate: router.push,
  });

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
  const refPolicy = referencePolicyFor(method);
  const osts = (members.data ?? []).filter((member) => member.designation === "OST").map((member) => ({ value: member.id, label: member.displayName }));

  if (!canManage) return <InfoNote title="View only">This account cannot create or edit customers.</InfoNote>;

  const attributionErrors = customerAttributionErrors(draft, pendingOstIds);
  const allErrors = (): CustomerErrors => ({
    ...validateCustomerForSubmit(toInput(draft), customers.data ?? [], undefined, supplementaryAllowed),
    ...attributionErrors,
  });

  const reportAttributionErrors = (fieldErrors: CustomerErrors) => {
    const message = fieldErrors.recommenderMemberId ?? fieldErrors.referrerMemberId;
    if (!message) return false;
    setStep(STEP_SALES);
    setFocusTick((tick) => tick + 1);
    toast.error(message);
    return true;
  };

  const handleAttributionFailure = (failure: unknown) => {
    if (!(failure instanceof CustomerValidationError) || !reportAttributionErrors(failure.errors)) return false;
    void accreditations.refetch();
    return true;
  };

  const choosePlan = (code: VipTierCode) => {
    const next = activeProducts.find((item) => item.code === code);
    if (code !== "G1") secondaryIdPreview.onClear();
    const keepScheme = (schemes.data ?? []).some((item) => item.id === draft.paymentSchemeId && item.applicableTiers.includes(code));
    setDraft((current) => ({
      ...current,
      vipPlan: code,
      paymentSchemeId: keepScheme ? current.paymentSchemeId : "",
      ...(next && next.supplementaryHolders > 0
        ? {}
        : {
            secEnabled: false,
            secFirstName: "",
            secMiddleName: "",
            secNoMiddleName: false,
            secLastName: "",
            secSuffix: "",
            secGender: "",
            secCivilStatus: "",
            secDateOfBirth: "",
            secMobileNumber: "",
            secEmail: "",
            secAddress: { street: "", province: "", city: "", barangay: "", postalCode: "" },
            secGovernmentIdType: "",
            secGovernmentIdNumber: "",
            secCitizenship: "",
            secTinNumber: "",
            secLandline: "",
            secOccupation: "",
            secBusinessIndustry: "",
            secEmployedPosition: "",
            secOfficeAddress: { street: "", municipality: "", province: "", postalCode: "" },
          }),
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
      const blocked = Object.keys(found).length > 0 || (from === STEP_RESERVATION && Object.keys(all).length > 0);
      if (blocked) {
        const failingKey = Object.keys(found)[0] ?? Object.keys(all)[0];
        // A step can block on a field it does not render (Reservation checks the
        // whole form). Point at the step that owns the first failing field and
        // show its own message, so Continue is never silent.
        const owningStep = failingKey
          ? Number(Object.keys(STEP_KEYS).find((index) => STEP_KEYS[Number(index)].includes(failingKey)) ?? from)
          : from;
        setErrors(failingKey ? { ...found, [failingKey]: all[failingKey] } : found);
        setStep(owningStep);
        // Normal steps already highlight their own fields; only the cross-step
        // case (Reservation validating the whole form) needs the message read out.
        toast.error(Object.keys(found).length > 0 ? "Complete the highlighted fields to continue." : (all[failingKey ?? ""] ?? "Complete the highlighted fields to continue."));
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

  const resetNewApplication = () => {
    setStep(STEP_CARD);
    setDraft(toDraft());
    setErrors({});
    setFocusTick(0);
    setMethod(DEFAULT_PAYMENT_METHOD);
    setPaidDate(initialPaidDate);
    setReference("");
    setReferenceTouched(false);
    setProofName("");
    setProofKey((key) => key + 1);
    setAccepted(false);
    setReservationErrors({});
    primaryIdPreview.onClear();
    secondaryIdPreview.onClear();
  };

  const saveDraft = async (leave?: () => void) => {
    if (busy) return;
    if (reportAttributionErrors(attributionErrors)) {
      exit.dismiss();
      return;
    }
    const input = toInput(draft, { saveAsDraft: true });
    setBusy(true);
    setAction("draft");
    try {
      const saved = existing
        ? await updateDraft.mutateAsync({ id: existing.id, input })
        : await create.mutateAsync(input);
      if (!existing) resetNewApplication();
      toast.success("Draft saved.");
      exit.dismiss();
      if (leave) leave();
      else router.push(`/admin/customers/${saved.id}`);
    } catch (failure) {
      exit.dismiss();
      if (!handleAttributionFailure(failure)) toast.error(failure instanceof Error ? failure.message : "Request failed.");
    } finally {
      setBusy(false);
    }
  };

  const submitApplication = async () => {
    if (busy) return;
    // Editing a submitted customer is an audited correction: collect the reason
    // first. Reservation evidence and acceptance belong to the original sale and
    // are not re-required for a data correction.
    if (isSubmitted) {
      setCorrecting(true);
      return;
    }
    if (reportAttributionErrors(attributionErrors)) return;
    const found: Record<string, string | undefined> = {};
    if (canPrepare && !accepted) found.accepted = "Confirm that the customer accepted the payment schedule.";
    if (canPrepare && canPay && reservationCentavos) {
      if (!proofName) found.proof = "Attach the proof of the reservation fee payment.";
      if (paidDate > manilaToday()) found.paidDate = "The payment date cannot be in the future.";
      const referenceError = validateReferenceNumber(reference, refPolicy);
      if (referenceError) {
        found.reference = referenceError;
        setReferenceTouched(true);
      }
    }
    setReservationErrors(found);
    if (Object.keys(found).length > 0) {
      // Acceptance is checked on Review; proof, date, and reference live on the
      // Reservation step. Go where the failing control is, and always say what
      // is missing so Submit never appears to do nothing.
      const onlyAcceptance = Object.keys(found).every((key) => key === "accepted");
      if (!onlyAcceptance) setStep(STEP_RESERVATION);
      toast.error(Object.values(found)[0] ?? "Complete the highlighted fields to continue.");
      return;
    }

    setBusy(true);
    setAction("submit");
    try {
      const result = await register.mutateAsync({
        customer: toInput(draft),
        draftId: existing?.id,
        contract: canPrepare && scheme ? {
          schemeId: scheme.id,
          customerAccepted: accepted,
          reservation: canPay && reservationCentavos
            ? { amountCentavos: reservationCentavos, method, paidDate, referenceNo: reference || null, evidenceFileName: proofName || null }
            : undefined,
        } : undefined,
      });

      primaryIdPreview.onClear();
      secondaryIdPreview.onClear();
      let successMessage: string | undefined;
      switch (result.status) {
        case "draft-kept": {
          const attributionMessage = result.errors.recommenderMemberId ?? result.errors.referrerMemberId;
          if (attributionMessage) {
            void accreditations.refetch();
            if (existing && reportAttributionErrors(result.errors)) return;
          }
          router.replace(`/admin/customers/${result.customerId}/edit`);
          toast.error(attributionMessage ?? "The application has incomplete fields. Your draft was kept.");
          return;
        }
        case "customer-submitted":
        case "contract-prepared":
        case "reservation-submitted":
          if (existing) toast.success(SUBMISSION_FEEDBACK[result.status].toast);
          else successMessage = SUBMISSION_FEEDBACK[result.status].description;
          break;
        case "contract-failed":
        case "reservation-failed":
          toast.error(`The customer was submitted, but the next step failed: ${result.error instanceof Error ? result.error.message : "Request failed."} Continue from the customer page.`);
          break;
      }
      if (successMessage) {
        resetNewApplication();
        setSubmissionSuccess(successMessage);
        return;
      }
      router.push(`/admin/customers/${result.customerId}`);
    } catch (failure) {
      if (!handleAttributionFailure(failure)) toast.error(failure instanceof Error ? failure.message : "Request failed.");
    } finally {
      setBusy(false);
    }
  };

  const schemeOptions: PaymentOption<string>[] = (schemes.data ?? [])
    .filter((item) => draft.vipPlan && item.applicableTiers.includes(draft.vipPlan as VipTierCode))
    .map((item) => {
      const content = schemeCardContent(item, product);
      return {
        value: item.id,
        label: item.commercialStatus === "configured" ? item.label : `${item.label} (terms pending)`,
        sub: content.total ? `${content.total} total` : undefined,
        icon: SCHEME_ICONS[item.category],
        disabled: item.availability !== "available",
        pill: content.pill ?? undefined,
        pillIcon: content.pill ? (
          item.category === "cash" ? (
            <Banknote aria-hidden className="tw:size-3.5" />
          ) : (
            <CalendarClock aria-hidden className="tw:size-3.5" />
          )
        ) : undefined,
      };
    });

  const reviewErrors = step === STEP_REVIEW ? allErrors() : {};
  const reviewErrorList = Object.values(reviewErrors).filter(Boolean) as string[];
  const priceConflict = product != null && applicablePriceStatus(product, scheme) === "conflict";

  return (
    <div ref={rootRef} className={cn("customer-application tw:scroll-mt-20 tw:gap-6", step > STEP_CARD ? "tw:grid tw:grid-cols-1 tw:lg:grid-cols-[20rem_minmax(0,1fr)] tw:lg:items-start" : "tw:flex tw:flex-col")}>
      {step > STEP_CARD && product ? <PlanSummary product={product} scheme={scheme} onChange={() => setStep(STEP_CARD)} onPlanChange={() => setStep(STEP_PLAN)} /> : null}
      <div className="customer-application__main tw:flex tw:min-w-0 tw:flex-col tw:gap-5">
      {step > STEP_CARD ? (
        <>
          <div className="tw:flex tw:flex-col tw:gap-1.5 tw:lg:hidden">
            <p className="tw:text-sm tw:font-medium">
              {STEPS[step]}
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
          </div>
          {products.isLoading ? (
            <div role="status" aria-busy="true"><span className="tw:sr-only">Loading VIP cards…</span><CardGridSkeleton cards={3} /></div>
          ) : (
            <VipCardChoiceGrid products={activeProducts} schemes={schemes.data ?? []} value={(draft.vipPlan || "") as VipTierCode | ""} onChange={choosePlan} invalid={Boolean(errors.vipPlan)} />
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
          <SectionBlock title="Payment plan" description="Choose how the customer pays." icon={<Banknote className="tw:size-4" />}>
            <FieldShell ids={schemeIds} label="Payment scheme" required error={errors.paymentSchemeId} labelFor={false}>
              <PaymentOptionGrid label="Payment scheme" value={draft.paymentSchemeId || undefined} onChange={(value: string) => set("paymentSchemeId", value)} options={schemeOptions} columns="three" describedBy={describedBy(schemeIds, errors.paymentSchemeId)} invalid={Boolean(errors.paymentSchemeId)} />
            </FieldShell>
          </SectionBlock>
          <SectionBlock title="Contract terms" description="Select contract type." icon={<FileText className="tw:size-4" />}>
            <FieldShell ids={classificationIds} label="Contract classification" required error={errors.contractClassification} labelFor={false}>
              <PaymentOptionGrid label="Contract classification" value={(draft.contractClassification || undefined) as "S" | "N" | undefined} onChange={(value: "S" | "N") => set("contractClassification", value)} options={CLASSIFICATION_OPTIONS.map((option) => ({ value: option.value, label: option.label, icon: option.icon }))} columns="two" describedBy={describedBy(classificationIds, errors.contractClassification)} invalid={Boolean(errors.contractClassification)} />
            </FieldShell>
          </SectionBlock>
          {priceConflict ? <PriceConflictNote /> : null}
        </div>
      ) : null}

      {step === STEP_CUSTOMER ? (
        <div className="tw:flex tw:flex-col tw:gap-4">
          <IdentitySection draft={draft} set={set} errors={errors} />
          <AddressSection draft={draft} set={set} errors={errors} />
          <ContactSection draft={draft} set={set} errors={errors} newApplication={!existing} />
          <GovernmentIdSection draft={draft} set={set} errors={errors} idPreview={existing ? undefined : primaryIdPreview} />
          <EmploymentSection draft={draft} set={set} errors={errors} />
          <SecondaryHolderToggle visible={draft.vipPlan === "G1"} enabled={draft.secEnabled} onChange={(enabled) => {
            if (!enabled) secondaryIdPreview.onClear();
            set("secEnabled", enabled);
          }} />
          {draft.vipPlan === "G1" && draft.secEnabled ? (
            <SecondaryHolderSection draft={draft} set={set} errors={errors} newApplication={!existing} idPreview={existing ? undefined : secondaryIdPreview} />
          ) : null}
        </div>
      ) : null}

      {step === STEP_SALES ? (
        <div className="tw:flex tw:flex-col tw:gap-4">
          <AttributionSection
            draft={draft}
            set={set}
            errors={errors}
            members={members.data ?? []}
            existing={customers.data ?? []}
            pendingOstIds={pendingOstIds}
            accreditationLoading={accreditations.isFetching}
          />
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
            <Row label="Price" value={product ? formatPeso(displayPriceFor(product, scheme)) : ""} />
            <Row label="Payment scheme" value={scheme?.label} />
            <Row label="Contract classification" value={draft.contractClassification === "N" ? "Non-Standard (N) — held at finalization until rules are approved" : draft.contractClassification === "S" ? "Standard (S)" : ""} />
          </ReviewBlock>
          {priceConflict ? <PriceConflictNote /> : null}
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
            {supplementaryAllowed ? <Row label="Supplementary holder" value={[draft.secFirstName, draft.secNoMiddleName ? "" : draft.secMiddleName, draft.secLastName, draft.secSuffix].filter(Boolean).join(" ")} /> : null}
            <Row label="Recommender" value={osts.find((item) => item.value === draft.recommenderMemberId)?.label} />
            <Row label="Acquisition channel" value={draft.acquisitionChannel} />
            <Row label="Customer ID" value={draft.customerNumber} />
            <Row label="Data privacy consent" value={draft.consentDataPrivacy ? "Certified" : "Not certified"} />
            <Row label="Government ID received" value={draft.idReceivedCertified ? "Certified" : "Not certified"} />
          </ReviewBlock>
          <ReviewBlock title="Reservation and acceptance" onEdit={() => setStep(STEP_RESERVATION)}>
            <Row label="Payment scheme" value={scheme?.label} />
            <Row label="Reservation fee" value={reservationCentavos ? formatPeso(reservationCentavos) : "None for this scheme"} />
            <Row label="Payment method" value={reservationCentavos && canPay ? method : "—"} />
            <Row label="Date on receipt" value={paidDate || "—"} />
            <Row label="Receipt/reference" value={reference || "—"} />
            <Row label="Proof" value={proofName || "—"} />
            <div className="tw:sm:col-span-2">
              <CheckboxField variant="card" label="The customer reviewed and accepted the payment schedule." checked={accepted} onChange={(value) => { setAccepted(value); setReservationErrors((current) => ({ ...current, accepted: undefined })); }} error={reservationErrors.accepted} />
            </div>
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
                <Row label="VIP card" value={product ? `${product.name} (${product.code}) · ${formatPeso(displayPriceFor(product, scheme))}` : ""} />
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
                  <RadioCardField label="Payment method" required value={method} options={PAYMENT_METHODS.map((value) => ({ value, label: value, icon: METHOD_ICONS[value] }))} onChange={(value) => { setMethod(value); setReference(cleanReferenceNumber(reference, referencePolicyFor(value))); }} />
                  <div className="tw:grid tw:grid-cols-1 tw:gap-3 tw:sm:grid-cols-2">
                    <StandardDateField label="Date on the receipt" required value={paidDate} onChange={setPaidDate} error={reservationErrors.paidDate} />
                    <TextField
                      label="Receipt or reference number"
                      value={reference}
                      onChange={(value) => setReference(cleanReferenceNumber(value, refPolicy))}
                      onBlur={() => setReferenceTouched(true)}
                      maxLength={REFERENCE_LIMITS[refPolicy].max}
                      hint={referenceHint(refPolicy)}
                      error={referenceTouched ? (validateReferenceNumber(reference, refPolicy) ?? undefined) : undefined}
                    />
                  </div>
                  <FieldShell ids={proofIds} label="Proof of payment" required error={reservationErrors.proof} hint="Only the file name is kept in this prototype.">
                    <div className="tw:flex tw:items-stretch tw:gap-2">
                      <input key={proofKey} id={proofIds.id} type="file" accept="image/*,application/pdf" aria-invalid={Boolean(reservationErrors.proof) || undefined} className="tw:peer tw:sr-only" onChange={(event) => setProofName(event.target.files?.[0]?.name ?? "")} />
                      <label
                        htmlFor={proofIds.id}
                        className={cn(
                          "customer-application__upload tw:flex tw:min-h-11 tw:min-w-0 tw:flex-1 tw:cursor-pointer tw:items-center tw:gap-3 tw:rounded-xl tw:border-2 tw:border-dashed tw:bg-card tw:px-3 tw:py-2 tw:transition-colors tw:hover:border-primary/60 tw:hover:bg-primary/5 tw:peer-focus-visible:ring-3 tw:peer-focus-visible:ring-ring/40",
                          reservationErrors.proof ? "tw:border-destructive" : proofName ? "tw:border-primary tw:bg-primary/5" : "tw:border-input",
                        )}
                      >
                        <span aria-hidden="true" className="tw:flex tw:size-7 tw:shrink-0 tw:items-center tw:justify-center tw:rounded-full tw:bg-secondary tw:text-primary">
                          <FileUp className="tw:size-4" />
                        </span>
                        <span className="tw:flex tw:min-w-0 tw:flex-1 tw:items-baseline tw:gap-1.5">
                          <span className="tw:truncate tw:text-sm tw:font-medium">{proofName || "Choose a file"}</span>
                          <span className="tw:shrink-0 tw:text-xs tw:text-muted-foreground">{proofName ? "Click to replace" : "Image or PDF"}</span>
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
            </SectionBlock>
          )}
        </div>
      ) : null}

      <Card className="customer-application__actions tw:sticky tw:bottom-2 tw:z-10 tw:flex-col-reverse tw:gap-2 tw:p-3 tw:shadow-md tw:sm:flex-row tw:sm:items-center tw:sm:justify-between tw:lg:static tw:lg:shadow-none">
        <div className="tw:flex tw:gap-2">
          <Button type="button" variant="outline" disabled={busy} className="tw:min-h-11 tw:flex-1 tw:sm:min-h-8 tw:sm:flex-none" onClick={() => (step === STEP_CARD ? exit.requestExit(() => router.back()) : setStep(step - 1))}>
            {step === STEP_CARD ? "Cancel" : (<><ArrowLeft aria-hidden="true" className="tw:size-4" /> Back</>)}
          </Button>
          {!isSubmitted ? (
            <Button type="button" variant="outline" loading={saving && action === "draft"} disabled={busy} className="tw:min-h-11 tw:flex-1 tw:sm:min-h-8 tw:sm:flex-none" onClick={() => void saveDraft()}>
              Save as draft
            </Button>
          ) : null}
        </div>
        {step < STEP_REVIEW ? (
          <Button type="button" disabled={busy || (step === STEP_CARD && !draft.vipPlan) || (step === STEP_REVIEW && reviewErrorList.length > 0)} className="tw:min-h-11 tw:sm:min-h-8" onClick={next}>
            Continue <ArrowRight aria-hidden="true" className="tw:size-4" />
          </Button>
        ) : (
          <Button type="button" loading={saving && action === "submit"} disabled={busy} className="tw:min-h-11 tw:sm:min-h-8" onClick={() => void submitApplication()}>
            {isSubmitted ? "Save correction" : "Submit application"}
          </Button>
        )}
      </Card>

      <AppAlert
        open={exit.destination !== null}
        title="Leave this application?"
        description={`Save the application as a customer draft to continue it later.${hasReservationChanges ? " Re-enter reservation details and payment evidence when you reopen the draft." : ""}${hasIdPreview ? " Government ID previews are temporary." : ""}`}
        confirmText="Save Draft"
        denyText="Discard all Changes"
        cancelText="Stay"
        pending={saving}
        onConfirm={() => void saveDraft(exit.destination ?? undefined)}
        onDeny={() => {
          const leave = exit.destination;
          exit.dismiss();
          resetNewApplication();
          leave?.();
        }}
        onClose={() => { if (!busy) exit.dismiss(); }}
      />

      {isSubmitted ? (
        <ReasonDialog
          open={correcting}
          title="Save data correction"
          description="Corrections to a submitted customer are audited. Explain what changed and why."
          confirmText="Save correction"
          successText="Correction saved."
          onClose={() => setCorrecting(false)}
          onSubmit={async (reason) => {
            try {
              await correct.mutateAsync({ id: existing.id, input: toInput(draft), reason });
              router.push(`/admin/customers/${existing.id}`);
            } catch (failure) {
              if (failure instanceof CustomerValidationError) setCorrecting(false);
              throw failure;
            }
          }}
        />
      ) : null}
      </div>
    </div>
  );
}
