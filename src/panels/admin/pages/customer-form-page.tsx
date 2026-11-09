"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CustomerValidationError } from "@/data/contracts/customer-repository";
import { useCreateCustomerDraft, useCustomers, useMembers } from "@/data/queries";
import { useDevIdentity } from "@/shared/providers/dev-identity-provider";
import { useCorrectCustomer, usePaymentSchemes, useSubmitCustomer, useUpdateCustomerDraft, useVipProducts, useDiscardCustomerDraft, useOperation } from "@/data/business-queries";
import { ACQUISITION_CHANNELS, type AcquisitionChannel, type Customer, type CustomerDraftInput } from "@/modules/customers/types";
import { composeCustomerName } from "@/modules/customers/rules";
import { CIVIL_STATUS_OPTIONS, GENDER_OPTIONS, GOV_ID_OPTIONS } from "@/modules/sales-network/accredited-seller";
import type { AddressValue } from "@/shared/forms/types";
import { CheckboxField, EmailField, GovernmentIdFields, MiddleNameField, PersonNameField, PhilippineAddressFields, PhilippineMobileField, SelectField, StandardDateField, SuffixField, TextField } from "@/shared/forms/modern";
import { FormGrid, FormSection } from "@/shared/components/modern/form-layout";
import { InfoNote } from "@/shared/components/modern/detail-list";
import { Button } from "@/shared/ui/button";
import { Skeleton } from "@/shared/ui/skeleton";
import { Card } from "@/shared/ui/card";
import { normalizePhilippineMobile } from "@/shared/utils/input-sanitizers";
import { ModulePage } from "../components/module-page";
import { ReasonDialog } from "@/shared/components/modern/form-dialog";

const EMPTY_ADDRESS: AddressValue = { street: "", province: "", city: "", barangay: "", subdivision: "", postalCode: "" };

type Draft = {
  firstName: string;
  middleName: string;
  noMiddleName: boolean;
  lastName: string;
  suffix: string;
  gender: string;
  civilStatus: string;
  dateOfBirth: string;
  mobileNumber: string;
  email: string;
  address: AddressValue;
  governmentIdType: string;
  governmentIdNumber: string;
  vipPlan: string;
  suppFirstName: string;
  suppMiddleName: string;
  suppLastName: string;
  suppGender: string;
  suppDateOfBirth: string;
  paymentSchemeId: string;
  contractClassification: string;
  recommenderMemberId: string;
  acquisitionChannel: string;
  customerNumber: string;
  ownerMemberId: string;
  consentDataPrivacy: boolean;
  idReceivedCertified: boolean;
};

function toDraft(customer?: Customer): Draft {
  return {
    firstName: customer?.firstName ?? "",
    middleName: customer?.middleName ?? "",
    noMiddleName: Boolean(customer && customer.firstName && !customer.middleName),
    lastName: customer?.lastName ?? "",
    suffix: customer?.suffix ?? "",
    gender: customer?.gender ?? "",
    civilStatus: customer?.civilStatus ?? "",
    dateOfBirth: customer?.dateOfBirth ?? "",
    mobileNumber: customer?.mobileNumber ?? "",
    email: customer?.email ?? "",
    address: customer?.address ?? EMPTY_ADDRESS,
    governmentIdType: customer?.governmentIdType ?? "",
    governmentIdNumber: customer?.governmentIdNumber ?? "",
    vipPlan: customer?.vipPlan ?? "",
    suppFirstName: customer?.supplementaryHolder?.firstName ?? "",
    suppMiddleName: customer?.supplementaryHolder?.middleName ?? "",
    suppLastName: customer?.supplementaryHolder?.lastName ?? "",
    suppGender: customer?.supplementaryHolder?.gender ?? "",
    suppDateOfBirth: customer?.supplementaryHolder?.dateOfBirth ?? "",
    paymentSchemeId: customer?.paymentSchemeId ?? "",
    contractClassification: customer?.contractClassification ?? "",
    recommenderMemberId: customer?.recommenderMemberId ?? "",
    acquisitionChannel: customer?.acquisitionChannel ?? "",
    customerNumber: customer?.customerNumber ?? "",
    ownerMemberId: customer?.ownerMemberId ?? "",
    consentDataPrivacy: customer?.consentDataPrivacy ?? false,
    idReceivedCertified: customer?.idReceivedCertified ?? false,
  };
}

function toInput(draft: Draft): CustomerDraftInput {
  const input: CustomerDraftInput = {
    displayName: composeCustomerName({ firstName: draft.firstName, middleName: draft.noMiddleName ? "" : draft.middleName, lastName: draft.lastName, suffix: draft.suffix }),
    firstName: draft.firstName.trim(),
    middleName: draft.noMiddleName ? null : draft.middleName.trim() || null,
    lastName: draft.lastName.trim(),
    suffix: draft.suffix || null,
    gender: draft.gender || null,
    civilStatus: draft.civilStatus || null,
    dateOfBirth: draft.dateOfBirth || null,
    mobileNumber: draft.mobileNumber ? normalizePhilippineMobile(draft.mobileNumber) : null,
    email: draft.email || null,
    address: draft.address,
    governmentIdType: draft.governmentIdType || null,
    governmentIdNumber: draft.governmentIdNumber || null,
    vipPlan: (draft.vipPlan || null) as CustomerDraftInput["vipPlan"],
    supplementaryHolder: draft.suppFirstName.trim() || draft.suppLastName.trim()
      ? { firstName: draft.suppFirstName.trim(), middleName: draft.suppMiddleName.trim() || null, lastName: draft.suppLastName.trim(), suffix: null, gender: draft.suppGender || null, dateOfBirth: draft.suppDateOfBirth || null }
      : null,
    paymentSchemeId: draft.paymentSchemeId || null,
    contractClassification: (draft.contractClassification || null) as CustomerDraftInput["contractClassification"],
    recommenderMemberId: draft.recommenderMemberId || null,
    acquisitionChannel: (draft.acquisitionChannel || null) as AcquisitionChannel | null,
    customerNumber: draft.customerNumber.trim() || null,
    consentDataPrivacy: draft.consentDataPrivacy,
    idReceivedCertified: draft.idReceivedCertified,
  };
  if (draft.ownerMemberId) input.ownerMemberId = draft.ownerMemberId;
  return input;
}

export function CustomerFormPage({ customerId }: { customerId?: string }) {
  const customers = useCustomers();
  const existing = customerId ? customers.data?.find((item) => item.id === customerId) : undefined;
  const loading = Boolean(customerId) && customers.isLoading;
  return (
    <ModulePage anyOf={["customers"]} title={customerId ? "Edit customer" : "New customer"} description="VIP application details. A draft can be saved incomplete." crumbs={[{ label: "Customers", href: "/admin/customers" }, { label: customerId ? "Edit" : "New" }]}>
      {loading ? <Skeleton className="tw:h-64 tw:w-full" /> : customerId && !existing ? <InfoNote title="Customer not found">This customer does not exist or is not visible to this account.</InfoNote> : <CustomerForm key={existing?.id ?? "new"} existing={existing} />}
    </ModulePage>
  );
}

function CustomerForm({ existing }: { existing?: Customer }) {
  const router = useRouter();
  const { identity } = useDevIdentity();
  const canManage = useOperation("customers.manage");
  const products = useVipProducts();
  const schemes = usePaymentSchemes();
  const members = useMembers();
  const create = useCreateCustomerDraft();
  const updateDraft = useUpdateCustomerDraft();
  const submit = useSubmitCustomer();
  const correct = useCorrectCustomer();
  const discard = useDiscardCustomerDraft();
  const [draft, setDraft] = useState<Draft>(() => toDraft(existing));
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [correcting, setCorrecting] = useState(false);
  const [busy, setBusy] = useState(false);
  const isDraft = !existing || existing.status === "draft";
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((current) => ({ ...current, [key]: value }));
  const supplementaryAllowed = (products.data ?? []).some((product) => product.code === draft.vipPlan && product.supplementaryHolders > 0);

  const osts = (members.data ?? []).filter((member) => member.designation === "OST").map((member) => ({ value: member.id, label: member.displayName }));
  const sellers = (members.data ?? []).map((member) => ({ value: member.id, label: `${member.displayName} (${member.designation})` }));

  if (!canManage) return <InfoNote title="View only">This account cannot create or edit customers.</InfoNote>;

  const run = async (work: () => Promise<unknown>, success: string, then?: () => void) => {
    setBusy(true);
    try {
      await work();
      toast.success(success);
      then?.();
    } catch (failure) {
      if (failure instanceof CustomerValidationError) {
        setErrors(failure.errors);
        toast.error("Review the highlighted fields. Your draft was kept.");
      } else toast.error(failure instanceof Error ? failure.message : "Request failed.");
    } finally {
      setBusy(false);
    }
  };

  const saveDraft = () => {
    setErrors({});
    return run(async () => {
      const input = toInput(draft);
      if (!input.displayName) throw new Error("Enter at least a first or last name to save a draft.");
      const saved = existing ? await updateDraft.mutateAsync({ id: existing.id, input }) : await create.mutateAsync(input);
      router.push(`/admin/customers/${saved.id}`);
    }, "Draft saved.");
  };

  const submitCustomer = () => {
    setErrors({});
    return run(async () => {
      const input = toInput(draft);
      let id = existing?.id;
      if (!id) {
        if (!input.displayName) throw new Error("Enter at least a first or last name.");
        id = (await create.mutateAsync(input)).id;
      }
      try {
        await submit.mutateAsync({ id, input });
      } catch (failure) {
        // The draft was created or already exists: keep it and show the field errors.
        if (!existing && failure instanceof CustomerValidationError) router.replace(`/admin/customers/${id}/edit`);
        throw failure;
      }
      router.push(`/admin/customers/${id}`);
    }, "Customer submitted.");
  };

  const schemeOptions = (schemes.data ?? []).map((scheme) => ({ value: scheme.id, label: scheme.commercialStatus === "configured" ? scheme.label : `${scheme.label} (terms pending)`, disabled: scheme.availability !== "available" }));
  const planOptions = (products.data ?? []).filter((item) => item.status === "active").map((item) => ({ value: item.code, label: `${item.name} (${item.code})` }));

  return (
    <Card className="tw:gap-6 tw:md:p-6">
    <form
      className="tw:flex tw:flex-col tw:gap-6"
      onSubmit={(event) => {
        event.preventDefault();
        if (isDraft) void submitCustomer();
        else setCorrecting(true);
      }}
    >
      {!isDraft ? <InfoNote title="Correcting a submitted customer">Changes are saved as an audited data correction with a reason.</InfoNote> : null}
      <FormSection title="VIP application">
        <FormGrid>
          <SelectField label="VIP plan" required value={draft.vipPlan || undefined} options={planOptions} onChange={(value) => setDraft((current) => ({ ...current, vipPlan: value, ...((products.data ?? []).some((product) => product.code === value && product.supplementaryHolders > 0) ? {} : { suppFirstName: "", suppMiddleName: "", suppLastName: "", suppGender: "", suppDateOfBirth: "" }) }))} placeholder="Select a plan" error={errors.vipPlan} />
          <SelectField label="Payment scheme" required value={draft.paymentSchemeId || undefined} options={schemeOptions} onChange={(value) => set("paymentSchemeId", value)} placeholder="Select a scheme" error={errors.paymentSchemeId} />
          <SelectField label="Contract classification" required value={(draft.contractClassification || undefined) as "S" | "N" | undefined} options={[{ value: "S", label: "Standard (S)" }, { value: "N", label: "Non-Standard (N)" }]} onChange={(value) => set("contractClassification", value)} placeholder="Select" error={errors.contractClassification} hint="Non-Standard contracts are held at finalization until their rules are approved." />
        </FormGrid>
      </FormSection>
      {supplementaryAllowed ? (
        <FormSection title="Supplementary holder (optional)">
          <FormGrid>
            <PersonNameField label="First name" value={draft.suppFirstName} onChange={(value) => set("suppFirstName", value)} error={errors.supplementaryHolder} />
            <PersonNameField label="Middle name" value={draft.suppMiddleName} onChange={(value) => set("suppMiddleName", value)} />
            <PersonNameField label="Last name" value={draft.suppLastName} onChange={(value) => set("suppLastName", value)} />
            <SelectField label="Gender" value={draft.suppGender || undefined} options={GENDER_OPTIONS} onChange={(value) => set("suppGender", value)} allowClear placeholder="Select gender" />
            <StandardDateField label="Date of birth" value={draft.suppDateOfBirth} onChange={(value) => set("suppDateOfBirth", value)} />
          </FormGrid>
        </FormSection>
      ) : null}
      <FormSection title="Personal details">
        <FormGrid>
          <PersonNameField label="First name" required value={draft.firstName} onChange={(value) => set("firstName", value)} error={errors.firstName} />
          <MiddleNameField label="Middle name" value={draft.middleName} onChange={(value) => set("middleName", value)} noMiddleName={draft.noMiddleName} onNoMiddleNameChange={(value) => set("noMiddleName", value)} />
          <PersonNameField label="Last name" required value={draft.lastName} onChange={(value) => set("lastName", value)} error={errors.lastName} />
          <SuffixField value={draft.suffix} onChange={(value) => set("suffix", value)} />
          <SelectField label="Gender" required value={draft.gender || undefined} options={GENDER_OPTIONS} onChange={(value) => set("gender", value)} placeholder="Select gender" error={errors.gender} />
          <SelectField label="Civil status" required value={draft.civilStatus || undefined} options={CIVIL_STATUS_OPTIONS} onChange={(value) => set("civilStatus", value)} placeholder="Select civil status" error={errors.civilStatus} />
          <StandardDateField label="Date of birth" required value={draft.dateOfBirth} onChange={(value) => set("dateOfBirth", value)} error={errors.dateOfBirth} />
        </FormGrid>
      </FormSection>
      <FormSection title="Contact">
        <FormGrid>
          <PhilippineMobileField label="Mobile number" required value={draft.mobileNumber} onChange={(value) => set("mobileNumber", value)} error={errors.mobileNumber} />
          <EmailField label="Email" value={draft.email} onChange={(value) => set("email", value)} error={errors.email} />
        </FormGrid>
      </FormSection>
      <FormSection title="Address">
        <PhilippineAddressFields value={draft.address} onChange={(value) => set("address", value)} required={{ province: true, city: true, barangay: true }} errors={errors.address ? { province: errors.address } : {}} />
      </FormSection>
      <FormSection title="Government ID">
        <FormGrid>
          <GovernmentIdFields idType={draft.governmentIdType || undefined} onIdTypeChange={(value) => set("governmentIdType", value)} idNumber={draft.governmentIdNumber} onIdNumberChange={(value) => set("governmentIdNumber", value)} idTypeOptions={GOV_ID_OPTIONS} />
        </FormGrid>
      </FormSection>
      <FormSection title="Network and channel">
        <FormGrid>
          <SelectField label="VIP recommender (OST)" showSearch value={draft.recommenderMemberId || undefined} options={osts} onChange={(value) => set("recommenderMemberId", value)} allowClear clearLabel="No recommender" placeholder="Type to search OST members" hint="Optional for direct IST sales." />
          <SelectField label="Acquisition channel" value={(draft.acquisitionChannel || undefined) as AcquisitionChannel | undefined} options={ACQUISITION_CHANNELS.map((value) => ({ value, label: value }))} onChange={(value) => set("acquisitionChannel", value)} allowClear placeholder="Select a channel" />
          {!existing && !identity.memberId ? <SelectField label="Owning seller" showSearch value={draft.ownerMemberId || undefined} options={sellers} onChange={(value) => set("ownerMemberId", value)} allowClear clearLabel="Company (no seller)" placeholder="Type to search members" hint="Contracts and sales follow this seller's team." /> : null}
          <TextField label="Customer ID" value={draft.customerNumber} onChange={(value) => set("customerNumber", value)} error={errors.customerNumber} hint="Entered manually. The official format is pending an owner decision, so only uniqueness is checked." />
        </FormGrid>
      </FormSection>
      <FormSection title="Certifications">
        <CheckboxField label="The customer consented to the processing of personal data under RA 10173." checked={draft.consentDataPrivacy} onChange={(value) => set("consentDataPrivacy", value)} error={errors.consentDataPrivacy} />
        <CheckboxField label="A valid government ID with specimen signatures was received." checked={draft.idReceivedCertified} onChange={(value) => set("idReceivedCertified", value)} error={errors.idReceivedCertified} />
      </FormSection>
      <div className="tw:flex tw:flex-col-reverse tw:gap-2 tw:sm:flex-row tw:sm:justify-end">
        <Button type="button" variant="outline" disabled={busy} className="tw:min-h-11 tw:sm:min-h-8" onClick={() => router.back()}>
          Cancel
        </Button>
        {isDraft && existing ? (
          <Button type="button" variant="outline" disabled={busy} className="tw:min-h-11 tw:sm:min-h-8" onClick={() => void run(() => discard.mutateAsync(existing.id), "Draft discarded.", () => router.push("/admin/customers"))}>
            Discard draft
          </Button>
        ) : null}
        {isDraft ? (
          <Button type="button" variant="outline" disabled={busy} className="tw:min-h-11 tw:sm:min-h-8" onClick={() => void saveDraft()}>
            Save as draft
          </Button>
        ) : null}
        <Button type="submit" disabled={busy} className="tw:min-h-11 tw:sm:min-h-8">
          {isDraft ? "Submit" : "Save correction"}
        </Button>
      </div>
      {existing && !isDraft ? (
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
              if (failure instanceof CustomerValidationError) {
                setErrors(failure.errors);
                setCorrecting(false);
              }
              throw failure;
            }
          }}
        />
      ) : null}
    </form>
    </Card>
  );
}
