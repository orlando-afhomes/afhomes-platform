"use client";

import { useMemo, useState, type FocusEvent, type ReactNode } from "react";
import { Briefcase, Heart, HeartCrack, HeartHandshake, HeartOff, IdCard, Handshake, MapPin, Mars, Phone, Split, User, UserRound, Users, Venus, type LucideIcon } from "lucide-react";
import { ACQUISITION_CHANNELS, type AcquisitionChannel, type Customer, type CustomerDraftInput, type SupplementaryHolder } from "@/modules/customers/types";
import { currentManilaYear, nextCustomerId } from "@/modules/customers/customer-number";
import { validateCustomerField, validateSecondaryField, type CustomerFieldContext } from "@/modules/customers/field-validation";
import { composeCustomerName } from "@/modules/customers/rules";
import type { OrgMember } from "@/modules/organization/types";
import { CIVIL_STATUS_OPTIONS, GENDER_OPTIONS, GOV_ID_OPTIONS } from "@/modules/sales-network/accredited-seller";
import { genealogyTeamOstIds, resolveAttributionChain, type AttributionPerson } from "@/modules/sales-network/genealogy";
import type { AddressValue, OfficeAddressValue } from "@/shared/forms/types";
import { computeAge } from "@/shared/lib/dates";
import { dialingPrefixFor } from "@/shared/data/philippine-locations";
import { customerAttributionErrors } from "@/modules/customers/attribution";
import { CustomerIdImagePreview, type CustomerIdImagePreviewState } from "./customer-id-image-preview";
import { CheckboxField, EmailField, GovernmentIdFields, MiddleNameField, PersonNameField, PhilippineAddressFields, PhilippineLandlineField, PhilippineMobileField, RadioCardField, SelectField, StandardDateField, SuffixField, TextField, TIN_DISPLAY_LENGTH, TinField } from "@/shared/forms/modern";
import { OfficeAddressFields } from "@/shared/forms/modern/structured-fields";
import { Button } from "@/shared/ui/button";
import { Switch } from "@/shared/ui/switch";
import { FormGrid } from "@/shared/components/modern/form-layout";
import { cleanBusinessInput, cleanBusinessLiveInput, cleanOccupationInput, cleanOccupationLiveInput, cleanTitleInput, govIdPolicyFor, MAX_BUSINESS_TEXT, MAX_LANDLINE_DIGITS, normalizePhilippineMobile, uppercaseGovId } from "@/shared/utils/input-sanitizers";
import { Card } from "@/shared/ui/card";

const EMPTY_ADDRESS: AddressValue = { street: "", province: "", city: "", barangay: "", postalCode: "" };
const EMPTY_OFFICE: OfficeAddressValue = { street: "", municipality: "", province: "", postalCode: "" };

/** Display width for a 10-digit landline plus up to three separators (e.g. 02-8888-8888). */
const LANDLINE_DISPLAY_LENGTH = MAX_LANDLINE_DIGITS + 3;

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
  citizenship: string;
  tinNumber: string;
  landline: string;
  occupation: string;
  businessIndustry: string;
  employedPosition: string;
  officeAddress: OfficeAddressValue;
  vipPlan: string;
  secEnabled: boolean;
  secFirstName: string;
  secMiddleName: string;
  secNoMiddleName: boolean;
  secLastName: string;
  secSuffix: string;
  secGender: string;
  secCivilStatus: string;
  secDateOfBirth: string;
  secMobileNumber: string;
  secEmail: string;
  secAddress: AddressValue;
  secGovernmentIdType: string;
  secGovernmentIdNumber: string;
  secCitizenship: string;
  secTinNumber: string;
  secLandline: string;
  secOccupation: string;
  secBusinessIndustry: string;
  secEmployedPosition: string;
  secOfficeAddress: OfficeAddressValue;
  paymentSchemeId: string;
  contractClassification: string;
  recommenderMemberId: string;
  /** OST who referred the customer; anchors the derived SM, SSM, and SVD. */
  referrerMemberId: string;
  acquisitionChannel: string;
  /** Automatic IDs are assigned on submit; manual IDs are entered and fixed. */
  customerIdMode: "auto" | "manual";
  customerNumber: string;
  /** Legacy/seller fallback for ownership when no referrer or recommender is set. */
  ownerMemberId: string;
  consentDataPrivacy: boolean;
  idReceivedCertified: boolean;
};

export type CustomerErrors = Record<string, string | undefined>;
export type SetDraft = <K extends keyof CustomerDraft>(key: K, value: CustomerDraft[K]) => void;

// The landed SupplementaryHolder covers the spec's secCitizenship/secTinNumber/
// secLandline/secOccupation/secBusinessIndustry/secEmployedPosition/
// secOfficeAddress keys but not the sec mirror's contact/address/ID keys, so
// this view reads those until the types worker extends the holder. The form
// spec (and the wizard reset) require the full mirror.
type HolderSource = SupplementaryHolder &
  Partial<{
    civilStatus: string | null;
    mobileNumber: string | null;
    email: string | null;
    address: AddressValue | null;
    governmentIdType: string | null;
    governmentIdNumber: string | null;
  }>;

export function toDraft(customer?: Customer): CustomerDraft {
  const holder = customer?.supplementaryHolder as HolderSource | null | undefined;
  return {
    firstName: customer?.firstName ?? "",
    middleName: customer?.middleName ?? "",
    noMiddleName: customer?.noMiddleName ?? Boolean(customer && customer.firstName && !customer.middleName),
    lastName: customer?.lastName ?? "",
    suffix: customer?.suffix ?? "",
    gender: customer?.gender ?? "",
    civilStatus: customer?.civilStatus ?? "",
    dateOfBirth: customer?.dateOfBirth ?? "",
    mobileNumber: customer?.mobileNumber ?? "",
    email: customer?.email ?? "",
    address: customer?.address ? { ...customer.address } : { ...EMPTY_ADDRESS },
    governmentIdType: customer?.governmentIdType ?? "",
    governmentIdNumber: customer?.governmentIdNumber ?? "",
    citizenship: customer?.citizenship ?? "",
    tinNumber: customer?.tinNumber ?? "",
    landline: customer?.landline ?? "",
    occupation: customer?.occupation ?? "",
    businessIndustry: customer?.businessIndustry ?? "",
    employedPosition: customer?.employedPosition ?? "",
    officeAddress: customer?.officeAddress ? { ...customer.officeAddress } : { ...EMPTY_OFFICE },
    vipPlan: customer?.vipPlan ?? "",
    secEnabled: Boolean(holder),
    secFirstName: holder?.firstName ?? "",
    secMiddleName: holder?.middleName ?? "",
    secNoMiddleName: holder?.noMiddleName ?? Boolean(holder && holder.firstName && !holder.middleName),
    secLastName: holder?.lastName ?? "",
    secSuffix: holder?.suffix ?? "",
    secGender: holder?.gender ?? "",
    secCivilStatus: holder?.civilStatus ?? "",
    secDateOfBirth: holder?.dateOfBirth ?? "",
    secMobileNumber: holder?.mobileNumber ?? "",
    secEmail: holder?.email ?? "",
    secAddress: holder?.address ? { ...holder.address } : { ...EMPTY_ADDRESS },
    secGovernmentIdType: holder?.governmentIdType ?? "",
    secGovernmentIdNumber: holder?.governmentIdNumber ?? "",
    secCitizenship: holder?.citizenship ?? "",
    secTinNumber: holder?.tinNumber ?? "",
    secLandline: holder?.landline ?? "",
    secOccupation: holder?.occupation ?? "",
    secBusinessIndustry: holder?.businessIndustry ?? "",
    secEmployedPosition: holder?.employedPosition ?? "",
    secOfficeAddress: holder?.officeAddress ? { ...holder.officeAddress } : { ...EMPTY_OFFICE },
    paymentSchemeId: customer?.paymentSchemeId ?? "",
    contractClassification: customer?.contractClassification ?? "",
    recommenderMemberId: customer?.recommenderMemberId ?? "",
    referrerMemberId: customer?.referrerMemberId ?? "",
    acquisitionChannel: customer?.acquisitionChannel ?? "",
    // Saved numbers are fixed: editing them reopens the manual path.
    customerIdMode: customer?.status === "draft" && customer.customerIdMode
      ? customer.customerIdMode
      : customer?.customerNumber ? "manual" : "auto",
    customerNumber: customer?.customerNumber ?? "",
    ownerMemberId: customer?.ownerMemberId ?? "",
    consentDataPrivacy: customer?.consentDataPrivacy ?? false,
    idReceivedCertified: customer?.idReceivedCertified ?? false,
  };
}

export function toInput(draft: CustomerDraft, { saveAsDraft = false } = {}): CustomerDraftInput {
  const secondaryProfile = {
    firstName: draft.secFirstName.trim(),
    middleName: draft.secNoMiddleName ? null : draft.secMiddleName.trim() || null,
    noMiddleName: draft.secNoMiddleName,
    lastName: draft.secLastName.trim(),
    suffix: draft.secSuffix || null,
    gender: draft.secGender || null,
    civilStatus: draft.secCivilStatus || null,
    dateOfBirth: draft.secDateOfBirth || null,
    mobileNumber: draft.secMobileNumber ? normalizePhilippineMobile(draft.secMobileNumber) : null,
    email: draft.secEmail || null,
    address: draft.secAddress,
    governmentIdType: draft.secGovernmentIdType || null,
    governmentIdNumber: draft.secGovernmentIdNumber || null,
    citizenship: draft.secCitizenship.trim() || null,
    tinNumber: draft.secTinNumber.trim() || null,
    landline: draft.secLandline.trim() || null,
    occupation: draft.secOccupation.trim() || null,
    businessIndustry: draft.secBusinessIndustry.trim() || null,
    employedPosition: draft.secEmployedPosition.trim() || null,
    officeAddress: draft.secOfficeAddress,
  };
  const secondaryProfileStarted = Object.values(secondaryProfile).some((value) =>
    value && (typeof value !== "object" || Object.values(value).some(Boolean)),
  );
  // Built as an unannotated literal so the full holder profile flows through
  // at runtime (the landed SupplementaryHolder type is narrower than the
  // spec's sec mirror; see HolderSource). Non-literal assignment skips excess
  // property checks while every declared key stays type-checked.
  const input = {
    displayName: composeCustomerName({ firstName: draft.firstName, middleName: draft.noMiddleName ? "" : draft.middleName, lastName: draft.lastName, suffix: draft.suffix }),
    firstName: draft.firstName.trim(),
    middleName: draft.noMiddleName ? null : draft.middleName.trim() || null,
    noMiddleName: draft.noMiddleName,
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
    citizenship: draft.citizenship.trim() || null,
    tinNumber: draft.tinNumber.trim() || null,
    landline: draft.landline.trim() || null,
    occupation: draft.occupation.trim() || null,
    businessIndustry: draft.businessIndustry.trim() || null,
    employedPosition: draft.employedPosition.trim() || null,
    officeAddress: draft.officeAddress,
    vipPlan: (draft.vipPlan || null) as CustomerDraftInput["vipPlan"],
    supplementaryHolder:
      draft.secEnabled && (saveAsDraft || secondaryProfileStarted) ? secondaryProfile : null,
    paymentSchemeId: draft.paymentSchemeId || null,
    contractClassification: (draft.contractClassification || null) as CustomerDraftInput["contractClassification"],
    recommenderMemberId: draft.recommenderMemberId || null,
    referrerMemberId: draft.referrerMemberId || null,
    acquisitionChannel: (draft.acquisitionChannel || null) as AcquisitionChannel | null,
    customerIdMode: draft.customerIdMode,
    customerNumber: draft.customerIdMode === "manual" ? draft.customerNumber.trim() || null : null,
    consentDataPrivacy: draft.consentDataPrivacy,
    idReceivedCertified: draft.idReceivedCertified,
  };
  // Ownership is derived from the attribution chain; the explicit owner stays as
  // the fallback so drafts started before attribution keep their owning seller.
  const ownerMemberId = draft.referrerMemberId || draft.recommenderMemberId || draft.ownerMemberId;
  return ownerMemberId ? { ...input, ownerMemberId } : input;
}

/** Titled block (own card, icon, short intro) so related inputs read as one unit. */
export function SectionBlock({ title, description, icon, action, children }: { title: string; description?: string; icon?: ReactNode; action?: ReactNode; children: ReactNode }) {
  return (
    <Card className="customer-application__block tw:gap-5 tw:p-5 tw:md:p-6">
      <header className="tw:flex tw:items-start tw:gap-3 tw:border-b tw:border-border tw:pb-4">
        {icon ? (
          <span aria-hidden="true" className="tw:flex tw:size-10 tw:shrink-0 tw:items-center tw:justify-center tw:rounded-xl tw:bg-primary/10 tw:text-primary">
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

/**
 * Per-field blur tracking for the live errors. Only the touched flags are
 * state; every error shown is derived from the current draft on each render,
 * so correcting a value clears its message without another state update.
 */
function useTouchedFields() {
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const markTouched = (key: string) => setTouched((current) => (current[key] ? current : { ...current, [key]: true }));
  // Field props take `string | undefined`, so a null result is normalized away.
  const localError = (key: string, value: string, ctx?: CustomerFieldContext): string | undefined =>
    touched[key] ? validateCustomerField(key, value, ctx) ?? undefined : undefined;
  const localSecondaryError = (key: string, value: string, ctx?: CustomerFieldContext): string | undefined =>
    touched[key] ? validateSecondaryField(key, value, ctx) ?? undefined : undefined;
  return { markTouched, localError, localSecondaryError };
}

/**
 * Marks a field of a shared group as touched once it loses focus. The shared
 * address and government-ID groups expose no per-field blur callback, so the
 * wrapper identifies the field by its stable DOM id.
 */
function markBlurredField(event: FocusEvent<HTMLElement>, fieldId: string, key: string, markTouched: (key: string) => void) {
  if (event.target instanceof HTMLElement && event.target.id === fieldId) markTouched(key);
}

const GENDER_ICONS: Record<string, LucideIcon> = { Male: Mars, Female: Venus };
const CIVIL_ICONS: Record<string, LucideIcon> = { Single: User, Married: HeartHandshake, Widowed: HeartCrack, Separated: Split, Divorced: HeartOff };

const GENDER_CARDS = GENDER_OPTIONS.map((option) => {
  const Icon = GENDER_ICONS[option.value] ?? UserRound;
  return { ...option, icon: <Icon className="tw:size-4" /> };
});
const CIVIL_CARDS = CIVIL_STATUS_OPTIONS.map((option) => {
  const Icon = CIVIL_ICONS[option.value] ?? Heart;
  return { ...option, icon: <Icon className="tw:size-3.5" /> };
});

export function IdentitySection({ draft, set, errors }: SectionProps) {
  const age = computeAge(draft.dateOfBirth);
  const { markTouched, localError } = useTouchedFields();
  return (
    <SectionBlock title="Personal details" description="Name, gender, civil status, and birth date as shown on the customer's government ID." icon={<UserRound className="tw:size-4" />}>
      <FormGrid>
        <PersonNameField
          label="First name"
          required
          value={draft.firstName}
          onChange={(value) => set("firstName", value)}
          onBlur={() => markTouched("firstName")}
          error={errors.firstName ?? localError("firstName", draft.firstName)}
        />
        <MiddleNameField label="Middle name" value={draft.middleName} onChange={(value) => set("middleName", value)} noMiddleName={draft.noMiddleName} onNoMiddleNameChange={(value) => set("noMiddleName", value)} />
        <PersonNameField
          label="Last name"
          required
          value={draft.lastName}
          onChange={(value) => set("lastName", value)}
          onBlur={() => markTouched("lastName")}
          error={errors.lastName ?? localError("lastName", draft.lastName)}
        />
        <SuffixField value={draft.suffix} onChange={(value) => set("suffix", value)} />
        <TextField
          label="Citizenship"
          value={draft.citizenship}
          onChange={(value) => set("citizenship", cleanTitleInput(value))}
          onBlur={() => {
            markTouched("citizenship");
            set("citizenship", cleanTitleInput(draft.citizenship));
          }}
          maxLength={80}
          autoComplete="off"
          error={errors.citizenship ?? localError("citizenship", draft.citizenship)}
        />
        <div onBlur={() => markTouched("dateOfBirth")}>
          <StandardDateField
            label="Date of birth"
            required
            value={draft.dateOfBirth}
            onChange={(value) => set("dateOfBirth", value)}
            error={errors.dateOfBirth ?? localError("dateOfBirth", draft.dateOfBirth)}
          />
        </div>
        <TextField label="Age" value={age === null ? "" : String(age)} onChange={() => {}} disabled hint="Derived from date of birth." />
      </FormGrid>
      <RadioCardField label="Gender" required value={draft.gender || undefined} options={GENDER_CARDS} onChange={(value) => set("gender", value)} error={errors.gender} />
      <RadioCardField label="Civil status" required value={draft.civilStatus || undefined} options={CIVIL_CARDS} onChange={(value) => set("civilStatus", value)} error={errors.civilStatus} />
    </SectionBlock>
  );
}

export function ContactSection({ draft, set, errors, newApplication }: SectionProps & { newApplication?: boolean }) {
  const dial = dialingPrefixFor(draft.address.province, draft.address.city);
  const { markTouched, localError } = useTouchedFields();
  return (
    <SectionBlock title="Contact" description="How the company reaches the customer." icon={<Phone className="tw:size-4" />}>
      <FormGrid>
        <PhilippineMobileField
          label="Mobile number"
          fixedPrefix={newApplication}
          required
          value={draft.mobileNumber}
          onChange={(value) => set("mobileNumber", value)}
          onBlur={() => markTouched("mobileNumber")}
          error={errors.mobileNumber ?? localError("mobileNumber", draft.mobileNumber)}
        />
        <EmailField
          label="Email"
          value={draft.email}
          onChange={(value) => set("email", value)}
          onBlur={() => markTouched("email")}
          error={errors.email ?? localError("email", draft.email)}
        />
        <PhilippineLandlineField
          label="Landline"
          localDigitsOnly={newApplication}
          value={draft.landline}
          onChange={(value) => set("landline", value)}
          onBlur={() => markTouched("landline")}
          maxLength={LANDLINE_DISPLAY_LENGTH}
          error={errors.landline ?? localError("landline", draft.landline, { areaCode: dial.areaCode })}
          countryCode={dial.countryCode}
          areaCode={dial.areaCode ?? undefined}
          hint={dial.areaCode ? (newApplication ? `Area code ${dial.areaCode} from the address.` : "Area code filled from the address.") : undefined}
        />
      </FormGrid>
    </SectionBlock>
  );
}

export function AddressSection({ draft, set, errors }: SectionProps) {
  const { markTouched, localError } = useTouchedFields();
  return (
    <SectionBlock title="Address" description="Residential address in the Philippines." icon={<MapPin className="tw:size-4" />}>
      <div onBlur={(event) => markBlurredField(event, "afhomes-street", "street", markTouched)}>
        <PhilippineAddressFields
          value={draft.address}
          onChange={(value) => set("address", value)}
          required={{ province: true, city: true, barangay: true }}
          errors={{ province: errors.address, street: errors.street ?? localError("street", draft.address.street) }}
        />
      </div>
    </SectionBlock>
  );
}

export function GovernmentIdSection({ draft, set, errors, idPreview }: SectionProps & { idPreview?: CustomerIdImagePreviewState }) {
  const { markTouched, localError } = useTouchedFields();
  return (
    <SectionBlock title="Government ID" description="The ID presented with the application." icon={<IdCard className="tw:size-4" />}>
      <FormGrid>
        {/* display:contents keeps both ID fields as direct grid cells while the wrapper catches their blur. */}
        <div className="tw:contents" onBlur={(event) => markBlurredField(event, "gov-id-number", "governmentIdNumber", markTouched)}>
          <GovernmentIdFields
            idType={draft.governmentIdType || undefined}
            onIdTypeChange={(value) => {
              set("governmentIdType", value);
              // Re-filter the existing number under the newly selected ID type's policy.
              set("governmentIdNumber", uppercaseGovId(draft.governmentIdNumber, govIdPolicyFor(value)));
            }}
            idNumber={draft.governmentIdNumber}
            onIdNumberChange={(value) => set("governmentIdNumber", uppercaseGovId(value, govIdPolicyFor(draft.governmentIdType)))}
            idTypeOptions={GOV_ID_OPTIONS}
            errorIdNumber={errors.governmentIdNumber ?? localError("governmentIdNumber", draft.governmentIdNumber, { idType: draft.governmentIdType })}
          />
        </div>
        <TinField
          label="TIN number"
          maxLength={TIN_DISPLAY_LENGTH}
          value={draft.tinNumber}
          onChange={(value) => set("tinNumber", value)}
          onBlur={() => markTouched("tinNumber")}
          error={errors.tinNumber ?? localError("tinNumber", draft.tinNumber)}
        />
        {idPreview ? <CustomerIdImagePreview preview={idPreview} /> : null}
      </FormGrid>
    </SectionBlock>
  );
}

export function EmploymentSection({ draft, set, errors }: SectionProps) {
  const { markTouched, localError } = useTouchedFields();
  return (
    <SectionBlock title="Employment" description="Work and business details plus the office address. All fields are optional." icon={<Briefcase className="tw:size-4" />}>
      <FormGrid>
        <TextField
          label="Occupation/Business Name"
          value={draft.occupation}
          onChange={(value) => set("occupation", cleanBusinessLiveInput(value))}
          onBlur={() => {
            markTouched("occupation");
            set("occupation", cleanBusinessInput(draft.occupation));
          }}
          error={errors.occupation ?? localError("occupation", draft.occupation)}
          maxLength={MAX_BUSINESS_TEXT}
          autoComplete="off"
        />
        <TextField
          label="Type of Business/Industry"
          value={draft.businessIndustry}
          onChange={(value) => set("businessIndustry", cleanOccupationLiveInput(value))}
          onBlur={() => {
            markTouched("businessIndustry");
            set("businessIndustry", cleanOccupationInput(draft.businessIndustry));
          }}
          error={errors.businessIndustry ?? localError("businessIndustry", draft.businessIndustry)}
          maxLength={MAX_BUSINESS_TEXT}
          autoComplete="off"
        />
        <TextField
          label="Employed Position"
          value={draft.employedPosition}
          onChange={(value) => set("employedPosition", cleanOccupationLiveInput(value))}
          onBlur={() => {
            markTouched("employedPosition");
            set("employedPosition", cleanOccupationInput(draft.employedPosition));
          }}
          error={errors.employedPosition ?? localError("employedPosition", draft.employedPosition)}
          maxLength={MAX_BUSINESS_TEXT}
          autoComplete="off"
        />
      </FormGrid>
      <div onBlur={(event) => markBlurredField(event, "afhomes-office-street", "street", markTouched)}>
        <OfficeAddressFields
          value={draft.officeAddress}
          onChange={(value) => set("officeAddress", value)}
          errors={{ street: errors.street ?? localError("street", draft.officeAddress.street) }}
        />
      </div>
    </SectionBlock>
  );
}

export function SecondaryHolderToggle({ visible, enabled, onChange }: { visible: boolean; enabled: boolean; onChange: (enabled: boolean) => void }) {
  if (!visible) return null;
  return (
    <SectionBlock title="Secondary card holder" description="Gold VIP allows one supplementary holder." icon={<Users className="tw:size-4" />}>
      <div className="tw:flex tw:items-center tw:gap-3">
        <Switch checked={enabled} onCheckedChange={onChange} aria-label="Add a secondary card holder" />
        <p className="tw:text-sm tw:font-medium">Add a secondary card holder</p>
      </div>
      <p className="tw:text-sm tw:text-muted-foreground">Turn on to add their full profile.</p>
    </SectionBlock>
  );
}

export function SecondaryHolderSection({ draft, set, errors, newApplication, idPreview }: SectionProps & {
  newApplication?: boolean;
  idPreview?: CustomerIdImagePreviewState;
}) {
  const secAge = computeAge(draft.secDateOfBirth);
  const secDial = dialingPrefixFor(draft.secAddress.province, draft.secAddress.city);
  const { markTouched, localSecondaryError } = useTouchedFields();
  return (
    <>
      <SectionBlock title="Personal details (Secondary holder)" description="Name, gender, civil status, and birth date of the secondary card holder as shown on their government ID." icon={<UserRound className="tw:size-4" />}>
        <FormGrid>
          <PersonNameField
            label="First name (Secondary holder)"
            value={draft.secFirstName}
            onChange={(value) => set("secFirstName", value)}
            onBlur={() => markTouched("firstName")}
            error={errors.supplementaryHolder ?? localSecondaryError("firstName", draft.secFirstName)}
          />
          <MiddleNameField label="Middle name (Secondary holder)" value={draft.secMiddleName} onChange={(value) => set("secMiddleName", value)} noMiddleName={draft.secNoMiddleName} onNoMiddleNameChange={(value) => set("secNoMiddleName", value)} />
          <PersonNameField
            label="Last name (Secondary holder)"
            value={draft.secLastName}
            onChange={(value) => set("secLastName", value)}
            onBlur={() => markTouched("lastName")}
            error={localSecondaryError("lastName", draft.secLastName)}
          />
          <SuffixField value={draft.secSuffix} onChange={(value) => set("secSuffix", value)} />
          <TextField
            label="Citizenship (Secondary holder)"
            value={draft.secCitizenship}
            onChange={(value) => set("secCitizenship", cleanTitleInput(value))}
            onBlur={() => {
              markTouched("citizenship");
              set("secCitizenship", cleanTitleInput(draft.secCitizenship));
            }}
            maxLength={80}
            autoComplete="off"
            error={localSecondaryError("citizenship", draft.secCitizenship)}
          />
          <div onBlur={() => markTouched("dateOfBirth")}>
            <StandardDateField
              label="Date of birth (Secondary holder)"
              value={draft.secDateOfBirth}
              onChange={(value) => set("secDateOfBirth", value)}
              error={localSecondaryError("dateOfBirth", draft.secDateOfBirth)}
            />
          </div>
          <TextField label="Age" value={secAge === null ? "" : String(secAge)} onChange={() => {}} disabled hint="Derived from date of birth." />
        </FormGrid>
        <RadioCardField label="Gender (Secondary holder)" value={draft.secGender || undefined} options={GENDER_CARDS} onChange={(value) => set("secGender", value)} />
        <RadioCardField label="Civil status (Secondary holder)" value={draft.secCivilStatus || undefined} options={CIVIL_CARDS} onChange={(value) => set("secCivilStatus", value)} />
      </SectionBlock>
      <SectionBlock title="Address (Secondary holder)" description="Residential address of the secondary card holder in the Philippines." icon={<MapPin className="tw:size-4" />}>
        <div onBlur={(event) => markBlurredField(event, "afhomes-street", "street", markTouched)}>
          <PhilippineAddressFields
            value={draft.secAddress}
            onChange={(value) => set("secAddress", value)}
            errors={{ street: localSecondaryError("street", draft.secAddress.street) }}
          />
        </div>
      </SectionBlock>
      <SectionBlock title="Contact (Secondary holder)" description="How the company reaches the secondary card holder." icon={<Phone className="tw:size-4" />}>
        <FormGrid>
          <PhilippineMobileField
            label="Mobile number (Secondary holder)"
            fixedPrefix={newApplication}
            value={draft.secMobileNumber}
            onChange={(value) => set("secMobileNumber", value)}
            onBlur={() => markTouched("mobileNumber")}
            error={localSecondaryError("mobileNumber", draft.secMobileNumber)}
          />
          <EmailField
            label="Email (Secondary holder)"
            value={draft.secEmail}
            onChange={(value) => set("secEmail", value)}
            onBlur={() => markTouched("email")}
            error={localSecondaryError("email", draft.secEmail)}
          />
          <PhilippineLandlineField
            label="Landline (Secondary holder)"
            localDigitsOnly={newApplication}
            value={draft.secLandline}
            onChange={(value) => set("secLandline", value)}
            onBlur={() => markTouched("landline")}
            maxLength={LANDLINE_DISPLAY_LENGTH}
            error={localSecondaryError("landline", draft.secLandline, { areaCode: secDial.areaCode })}
            countryCode={secDial.countryCode}
            areaCode={secDial.areaCode ?? undefined}
            hint={secDial.areaCode ? (newApplication ? `Area code ${secDial.areaCode} from the address.` : "Area code filled from the address.") : undefined}
          />
        </FormGrid>
      </SectionBlock>
      <SectionBlock title="Government ID (Secondary holder)" description="The ID presented with the secondary holder application." icon={<IdCard className="tw:size-4" />}>
        <FormGrid>
          {/* display:contents keeps both ID fields as direct grid cells while the wrapper catches their blur. */}
          <div className="tw:contents" onBlur={(event) => markBlurredField(event, "sec-gov-id-number", "governmentIdNumber", markTouched)}>
            <GovernmentIdFields
              idType={draft.secGovernmentIdType || undefined}
              onIdTypeChange={(value) => {
                set("secGovernmentIdType", value);
                // Re-filter the existing number under the newly selected ID type's policy.
                set("secGovernmentIdNumber", uppercaseGovId(draft.secGovernmentIdNumber, govIdPolicyFor(value)));
              }}
              idNumber={draft.secGovernmentIdNumber}
              onIdNumberChange={(value) => set("secGovernmentIdNumber", uppercaseGovId(value, govIdPolicyFor(draft.secGovernmentIdType)))}
              idTypeOptions={GOV_ID_OPTIONS}
              idPrefix="sec-gov-id"
              errorIdNumber={localSecondaryError("governmentIdNumber", draft.secGovernmentIdNumber, { idType: draft.secGovernmentIdType })}
            />
          </div>
          <TinField
            label="TIN number (Secondary holder)"
            maxLength={TIN_DISPLAY_LENGTH}
            value={draft.secTinNumber}
            onChange={(value) => set("secTinNumber", value)}
            onBlur={() => markTouched("tinNumber")}
            error={localSecondaryError("tinNumber", draft.secTinNumber)}
          />
          {idPreview ? <CustomerIdImagePreview preview={idPreview} secondary /> : null}
        </FormGrid>
      </SectionBlock>
      <SectionBlock title="Employment (Secondary holder)" description="Work and business details plus the office address of the secondary card holder. All fields are optional." icon={<Briefcase className="tw:size-4" />}>
        <FormGrid>
          <TextField
            label="Occupation/Business Name (Secondary holder)"
            value={draft.secOccupation}
            onChange={(value) => set("secOccupation", cleanBusinessLiveInput(value))}
            onBlur={() => {
              markTouched("occupation");
              set("secOccupation", cleanBusinessInput(draft.secOccupation));
            }}
            maxLength={MAX_BUSINESS_TEXT}
            autoComplete="off"
            error={localSecondaryError("occupation", draft.secOccupation)}
          />
          <TextField
            label="Type of Business/Industry (Secondary holder)"
            value={draft.secBusinessIndustry}
            onChange={(value) => set("secBusinessIndustry", cleanOccupationLiveInput(value))}
            onBlur={() => {
              markTouched("businessIndustry");
              set("secBusinessIndustry", cleanOccupationInput(draft.secBusinessIndustry));
            }}
            maxLength={MAX_BUSINESS_TEXT}
            autoComplete="off"
            error={localSecondaryError("businessIndustry", draft.secBusinessIndustry)}
          />
          <TextField
            label="Employed Position (Secondary holder)"
            value={draft.secEmployedPosition}
            onChange={(value) => set("secEmployedPosition", cleanOccupationLiveInput(value))}
            onBlur={() => {
              markTouched("employedPosition");
              set("secEmployedPosition", cleanOccupationInput(draft.secEmployedPosition));
            }}
            maxLength={MAX_BUSINESS_TEXT}
            autoComplete="off"
            error={localSecondaryError("employedPosition", draft.secEmployedPosition)}
          />
        </FormGrid>
        <div onBlur={(event) => markBlurredField(event, "afhomes-office-street", "street", markTouched)}>
          <OfficeAddressFields
            value={draft.secOfficeAddress}
            onChange={(value) => set("secOfficeAddress", value)}
            errors={{ street: localSecondaryError("street", draft.secOfficeAddress.street) }}
          />
        </div>
      </SectionBlock>
    </>
  );
}

/** Party label used by the attribution selects and derived rows: name plus AA number. */
function attributionPartyLabel(person: { displayName: string; aaNumber?: string | null }): string {
  const aaNumber = person.aaNumber?.trim();
  return aaNumber ? `${person.displayName} · ${aaNumber}` : person.displayName;
}

const EMPTY_ATTRIBUTION_PARTY = "—";

function derivedAttributionValue(person: AttributionPerson | null): string {
  return person ? attributionPartyLabel(person) : EMPTY_ATTRIBUTION_PARTY;
}

const CUSTOMER_ID_MODE_OPTIONS: ReadonlyArray<{ value: CustomerDraft["customerIdMode"]; label: string }> = [
  { value: "auto", label: "Automatic" },
  { value: "manual", label: "Manual" },
];

export type AttributionSectionProps = SectionProps & {
  /** Sales Network roster: active OSTs become options and the derived upline comes from its genealogy. */
  members: readonly OrgMember[];
  pendingOstIds: ReadonlySet<string> | null;
  accreditationLoading?: boolean;
  /** Customers already on file, used to preview the next automatic Customer ID. */
  existing: readonly Customer[];
};

export function AttributionSection({ draft, set, errors, members, existing, pendingOstIds, accreditationLoading }: AttributionSectionProps) {
  const attributionErrors = customerAttributionErrors(draft, pendingOstIds);
  const recommenderId = attributionErrors.recommenderMemberId ? "" : draft.recommenderMemberId;
  const referrerId = attributionErrors.referrerMemberId ? "" : draft.referrerMemberId;
  const accreditationHint = pendingOstIds === null
    ? (accreditationLoading ? "Checking OST accreditation…" : "OST accreditation is unavailable.")
    : undefined;
  const ostOptions = useMemo(
    () =>
      members
        .filter((member) => member.designation === "OST" && member.status === "active" && pendingOstIds && !pendingOstIds.has(member.id))
        .slice()
        .sort((left, right) => left.displayName.localeCompare(right.displayName))
        .map((member) => ({ value: member.id, label: attributionPartyLabel(member) })),
    [members, pendingOstIds],
  );

  // Both parties must sit in the same genealogy team: the referrer list is
  // limited to the recommender's team and vice versa. Before either is chosen,
  // the full active-OST roster is offered.
  const recommenderTeam = useMemo(() => genealogyTeamOstIds(members, recommenderId), [members, recommenderId]);
  const referrerTeam = useMemo(() => genealogyTeamOstIds(members, referrerId), [members, referrerId]);
  const recommenderOptions = referrerTeam.size > 0 ? ostOptions.filter((option) => referrerTeam.has(option.value)) : ostOptions;
  const referrerOptions = recommenderTeam.size > 0 ? ostOptions.filter((option) => recommenderTeam.has(option.value)) : ostOptions;

  // The resolver falls back to the recommender when no referrer is set and walks
  // the actual genealogy, so the read-only upline always matches network records.
  const chain = useMemo(
    () => resolveAttributionChain(members, referrerId, recommenderId),
    [members, referrerId, recommenderId],
  );

  const customerIdMode = draft.customerIdMode === "manual" ? "manual" : "auto";

  const automaticCustomerId = useMemo(() => {
    try {
      return nextCustomerId(existing, currentManilaYear());
    } catch {
      // Exhausted year: the submit path reports it; the preview stays blank rather than throwing.
      return EMPTY_ATTRIBUTION_PARTY;
    }
  }, [existing]);

  return (
    <SectionBlock title="Sales attribution" description="Who recommended the customer and how the lead arrived." icon={<Handshake className="tw:size-4" />}>
      <FormGrid>
        <SelectField
          label="OST (Recommender)"
          disabled={pendingOstIds === null}
          error={attributionErrors.recommenderMemberId}
          value={recommenderId || undefined}
          options={recommenderOptions}
          onChange={(value) => {
            set("recommenderMemberId", value);
            const chosenTeam = genealogyTeamOstIds(members, value);
            if (value && (!referrerId || (chosenTeam.size > 0 && !chosenTeam.has(referrerId)))) {
              set("referrerMemberId", value);
            }
          }}
          allowClear
          clearLabel="No recommender"
          placeholder="Type to search OST members"
          hint={accreditationHint ?? "Optional for direct IST sales."}
        />
        <SelectField
          label="OST (Referrer)"
          disabled={pendingOstIds === null}
          error={attributionErrors.referrerMemberId}
          value={referrerId || undefined}
          options={referrerOptions}
          onChange={(value) => {
            set("referrerMemberId", value);
            const chosenTeam = genealogyTeamOstIds(members, value);
            const recommenderOutside = value && recommenderId && chosenTeam.size > 0 && !chosenTeam.has(recommenderId);
            if (recommenderOutside) set("recommenderMemberId", value);
          }}
          allowClear
          clearLabel="No referrer"
          placeholder="Type to search OST members"
          hint={accreditationHint ?? "Same team as the recommender."}
        />
        <TextField label="SM" value={derivedAttributionValue(chain.sm)} onChange={() => {}} disabled />
        <TextField label="SSM" value={derivedAttributionValue(chain.ssm)} onChange={() => {}} disabled />
        <TextField label="SVD" value={derivedAttributionValue(chain.svd)} onChange={() => {}} disabled />
      </FormGrid>
      {pendingOstIds === null && (draft.recommenderMemberId || draft.referrerMemberId) ? (
        <div>
          <Button type="button" variant="outline" onClick={() => {
            set("recommenderMemberId", "");
            set("referrerMemberId", "");
          }}>
            Clear OST selections
          </Button>
        </div>
      ) : null}
      <div className="tw:flex tw:flex-col tw:gap-3 tw:border-t tw:border-border tw:pt-4">
        <RadioCardField
          label="Customer ID assignment"
          value={customerIdMode}
          options={CUSTOMER_ID_MODE_OPTIONS}
          onChange={(value) => set("customerIdMode", value)}
          hint="Automatic IDs are assigned on submission. Manual IDs must match the official format."
        />
        {customerIdMode === "auto" ? (
          <TextField id="customer-id" label="Customer ID" value={automaticCustomerId} onChange={() => {}} disabled hint="Assigned when the application is submitted." />
        ) : (
          <TextField
            id="customer-id"
            label="Customer ID"
            value={draft.customerNumber}
            onChange={(value) => set("customerNumber", value.replace(/[^0-9-]/g, ""))}
            error={errors.customerNumber}
            hint="Format YYYY-NNNN, for example 2026-0001."
          />
        )}
      </div>
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
