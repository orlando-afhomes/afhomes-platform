"use client";

import { Heart, Users, UserRound, Phone, MapPin, IdCard, Handshake } from "lucide-react";
import { ACQUISITION_CHANNELS, type AcquisitionChannel, type Customer, type CustomerDraftInput } from "@/modules/customers/types";
import { composeCustomerName } from "@/modules/customers/rules";
import { CIVIL_STATUS_OPTIONS, GENDER_OPTIONS, GOV_ID_OPTIONS } from "@/modules/sales-network/accredited-seller";
import type { AddressValue } from "@/shared/forms/types";
import { CheckboxField, EmailField, GovernmentIdFields, MiddleNameField, PersonNameField, PhilippineAddressFields, PhilippineMobileField, RadioCardField, SelectField, StandardDateField, SuffixField, TextField } from "@/shared/forms/modern";
import { FormGrid } from "@/shared/components/modern/form-layout";
import { normalizePhilippineMobile } from "@/shared/utils/input-sanitizers";
import { Card } from "@/shared/ui/card";
import type { ReactNode } from "react";

const EMPTY_ADDRESS: AddressValue = { street: "", province: "", city: "", barangay: "", subdivision: "", postalCode: "" };

export type CustomerDraft = {
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

export type CustomerErrors = Record<string, string | undefined>;
export type SetDraft = <K extends keyof CustomerDraft>(key: K, value: CustomerDraft[K]) => void;

export function toDraft(customer?: Customer): CustomerDraft {
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

export function toInput(draft: CustomerDraft): CustomerDraftInput {
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

/** Titled block (own card, icon, short intro) so related inputs read as one unit. */
export function SectionBlock({ title, description, icon, action, children }: { title: string; description?: string; icon?: ReactNode; action?: ReactNode; children: ReactNode }) {
  return (
    <Card className="customer-application__block tw:gap-5 tw:p-5 tw:md:p-6">
      <header className="tw:flex tw:items-start tw:gap-3 tw:border-b tw:border-border tw:pb-4">
        {icon ? (
          <span aria-hidden="true" className="tw:flex tw:size-10 tw:shrink-0 tw:items-center tw:justify-center tw:rounded-full tw:bg-secondary tw:text-primary">
            {icon}
          </span>
        ) : null}
        <div className="tw:flex tw:min-w-0 tw:flex-1 tw:flex-col tw:gap-0.5">
          <h3 className="tw:text-base tw:font-semibold tw:tracking-tight">{title}</h3>
          {description ? <p className="tw:text-sm tw:text-muted-foreground">{description}</p> : null}
        </div>
        {action ? <div className="tw:shrink-0">{action}</div> : null}
      </header>
      {children}
    </Card>
  );
}

type SectionProps = { draft: CustomerDraft; set: SetDraft; errors: CustomerErrors };

const GENDER_CARDS = GENDER_OPTIONS.map((option) => ({ ...option, icon: <UserRound className="tw:size-4" /> }));
const CIVIL_CARDS = CIVIL_STATUS_OPTIONS.map((option) => ({ ...option, icon: <Heart className="tw:size-3.5" /> }));

export function IdentitySection({ draft, set, errors }: SectionProps) {
  return (
    <SectionBlock title="Personal details" description="Name, gender, civil status, and birth date as shown on the customer's government ID." icon={<UserRound className="tw:size-4" />}>
      <FormGrid>
        <PersonNameField label="First name" required value={draft.firstName} onChange={(value) => set("firstName", value)} error={errors.firstName} />
        <MiddleNameField label="Middle name" value={draft.middleName} onChange={(value) => set("middleName", value)} noMiddleName={draft.noMiddleName} onNoMiddleNameChange={(value) => set("noMiddleName", value)} />
        <PersonNameField label="Last name" required value={draft.lastName} onChange={(value) => set("lastName", value)} error={errors.lastName} />
        <SuffixField value={draft.suffix} onChange={(value) => set("suffix", value)} />
        <StandardDateField label="Date of birth" required value={draft.dateOfBirth} onChange={(value) => set("dateOfBirth", value)} error={errors.dateOfBirth} />
      </FormGrid>
      <RadioCardField label="Gender" required value={draft.gender || undefined} options={GENDER_CARDS} onChange={(value) => set("gender", value)} error={errors.gender} />
      <RadioCardField label="Civil status" required value={draft.civilStatus || undefined} options={CIVIL_CARDS} onChange={(value) => set("civilStatus", value)} error={errors.civilStatus} />
    </SectionBlock>
  );
}

export function ContactSection({ draft, set, errors }: SectionProps) {
  return (
    <SectionBlock title="Contact" description="How the company reaches the customer." icon={<Phone className="tw:size-4" />}>
      <FormGrid>
        <PhilippineMobileField label="Mobile number" required value={draft.mobileNumber} onChange={(value) => set("mobileNumber", value)} error={errors.mobileNumber} />
        <EmailField label="Email" value={draft.email} onChange={(value) => set("email", value)} error={errors.email} />
      </FormGrid>
    </SectionBlock>
  );
}

export function AddressSection({ draft, set, errors }: SectionProps) {
  return (
    <SectionBlock title="Address" description="Residential address in the Philippines." icon={<MapPin className="tw:size-4" />}>
      <PhilippineAddressFields value={draft.address} onChange={(value) => set("address", value)} required={{ province: true, city: true, barangay: true }} errors={errors.address ? { province: errors.address } : {}} />
    </SectionBlock>
  );
}

export function GovernmentIdSection({ draft, set }: SectionProps) {
  return (
    <SectionBlock title="Government ID" description="The ID presented with the application." icon={<IdCard className="tw:size-4" />}>
      <FormGrid>
        <GovernmentIdFields idType={draft.governmentIdType || undefined} onIdTypeChange={(value) => set("governmentIdType", value)} idNumber={draft.governmentIdNumber} onIdNumberChange={(value) => set("governmentIdNumber", value)} idTypeOptions={GOV_ID_OPTIONS} />
      </FormGrid>
    </SectionBlock>
  );
}

export function SupplementarySection({ draft, set, errors }: SectionProps) {
  return (
    <SectionBlock title="Supplementary holder (optional)" description="Gold VIP allows one supplementary holder." icon={<Users className="tw:size-4" />}>
      <FormGrid>
        <PersonNameField label="First name" value={draft.suppFirstName} onChange={(value) => set("suppFirstName", value)} error={errors.supplementaryHolder} />
        <PersonNameField label="Middle name" value={draft.suppMiddleName} onChange={(value) => set("suppMiddleName", value)} />
        <PersonNameField label="Last name" value={draft.suppLastName} onChange={(value) => set("suppLastName", value)} />
        <StandardDateField label="Date of birth" value={draft.suppDateOfBirth} onChange={(value) => set("suppDateOfBirth", value)} />
      </FormGrid>
      <RadioCardField label="Gender" value={draft.suppGender || undefined} options={GENDER_CARDS} onChange={(value) => set("suppGender", value)} />
    </SectionBlock>
  );
}

export function AttributionSection({ draft, set, errors, osts, sellers, showOwner }: SectionProps & { osts: { value: string; label: string }[]; sellers: { value: string; label: string }[]; showOwner: boolean }) {
  return (
    <SectionBlock title="Sales attribution" description="Who recommended the customer and how the lead arrived." icon={<Handshake className="tw:size-4" />}>
      <FormGrid>
        <SelectField label="VIP recommender (OST)" showSearch value={draft.recommenderMemberId || undefined} options={osts} onChange={(value) => set("recommenderMemberId", value)} allowClear clearLabel="No recommender" placeholder="Type to search OST members" hint="Optional for direct IST sales." />
        {showOwner ? <SelectField label="Owning seller" showSearch value={draft.ownerMemberId || undefined} options={sellers} onChange={(value) => set("ownerMemberId", value)} allowClear clearLabel="Company (no seller)" placeholder="Type to search members" hint="Contracts and sales follow this seller's team." /> : null}
        <TextField label="Customer ID" value={draft.customerNumber} onChange={(value) => set("customerNumber", value)} error={errors.customerNumber} hint="Entered manually. The official format is pending an owner decision, so only uniqueness is checked." />
      </FormGrid>
      <RadioCardField label="Acquisition channel" value={(draft.acquisitionChannel || undefined) as AcquisitionChannel | undefined} options={ACQUISITION_CHANNELS.map((value) => ({ value, label: value }))} onChange={(value) => set("acquisitionChannel", value)} hint="Optional." />
    </SectionBlock>
  );
}

export function CertificationsSection({ draft, set, errors }: SectionProps) {
  return (
    <SectionBlock title="Certifications" description="Both are required before the application can be submitted.">
      <CheckboxField variant="card" label="The customer consented to the processing of personal data under RA 10173." checked={draft.consentDataPrivacy} onChange={(value) => set("consentDataPrivacy", value)} error={errors.consentDataPrivacy} />
      <CheckboxField variant="card" label="A valid government ID with specimen signatures was received." checked={draft.idReceivedCertified} onChange={(value) => set("idReceivedCertified", value)} error={errors.idReceivedCertified} />
    </SectionBlock>
  );
}
