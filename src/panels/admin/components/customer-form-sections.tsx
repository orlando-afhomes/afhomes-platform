"use client";

import { useMemo, useState, type FocusEvent, type ReactNode } from "react";
import { Briefcase, Heart, HeartCrack, HeartHandshake, HeartOff, IdCard, Handshake, MapPin, Mars, Phone, Split, User, UserRound, Users, Venus, type LucideIcon } from "lucide-react";
import { ACQUISITION_CHANNELS, type AcquisitionChannel, type Customer } from "@/modules/customers/types";
import { CITIZENSHIP_OPTIONS, citizenshipLabels } from "@/modules/customers/citizenship";
import { currentManilaYear, nextCustomerId } from "@/modules/customers/customer-number";
import { validateCustomerField, validateSecondaryField, type CustomerFieldContext } from "@/modules/customers/field-validation";
import type { OrgMember } from "@/modules/organization/types";
import { CIVIL_STATUS_OPTIONS, GENDER_OPTIONS } from "@/modules/sales-network/accredited-seller";
import { useReferenceOptions } from "@/data/settings-queries";
import { computeAge } from "@/shared/lib/dates";
import { dialingPrefixFor } from "@/shared/data/philippine-locations";
import { customerAttributionErrors, sellerUpline } from "@/modules/customers/attribution";
import { CustomerIdImagePreview, type CustomerIdImagePreviewState } from "./customer-id-image-preview";
import { CheckboxField, EmailField, GovernmentIdFields, MiddleNameField, PersonNameField, PhilippineAddressFields, PhilippineLandlineField, PhilippineMobileField, RadioCardField, SelectField, StandardDateField, SuffixField, TextField, TIN_DISPLAY_LENGTH, TinField } from "@/shared/forms/modern";
import { OfficeAddressFields } from "@/shared/forms/modern/structured-fields";
import { Button } from "@/shared/ui/button";
import { Switch } from "@/shared/ui/switch";
import { FormGrid } from "@/shared/components/modern/form-layout";
import { cleanBusinessInput, cleanBusinessLiveInput, cleanOccupationInput, cleanOccupationLiveInput, cleanTitleInput, MAX_BUSINESS_TEXT, MAX_LANDLINE_DIGITS } from "@/shared/utils/input-sanitizers";
import { Card } from "@/shared/ui/card";
import type { CustomerDraft, CustomerErrors, SetDraft } from "./customer-draft";


/** Display width for a 10-digit landline plus up to three separators (e.g. 02-8888-8888). */
const LANDLINE_DISPLAY_LENGTH = MAX_LANDLINE_DIGITS + 3;

/** Optional courtesy titles (owner instruction 2026-11-20). */
const PREFIX_OPTIONS = ["Mr.", "Mrs.", "Ms.", "Miss", "Mx.", "Dr.", "Atty.", "Engr.", "Arch.", "Prof.", "Rev.", "Fr.", "Sr.", "Hon."].map((value) => ({ value, label: value }));

export { toDraft, toInput, type CustomerDraft, type CustomerErrors, type SetDraft } from "./customer-draft";

/** Titled block (own card, icon, short intro) so related inputs read as one unit. */
export function SectionBlock({ title, description, icon, iconTone, action, children }: { title: string; description?: string; icon?: ReactNode; /** Tailwind classes for the icon chip colors; defaults to the brand tint. */ iconTone?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <Card className="customer-application__block tw:gap-5 tw:p-5 tw:md:p-6">
      <header className="tw:flex tw:items-start tw:gap-3 tw:border-b tw:border-border tw:pb-4">
        {icon ? (
          <span aria-hidden="true" className={`tw:flex tw:size-10 tw:shrink-0 tw:items-center tw:justify-center tw:rounded-xl ${iconTone ?? "tw:bg-primary/10 tw:text-primary"}`}>
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

export const GENDER_CARDS = GENDER_OPTIONS.map((option) => {
  const Icon = GENDER_ICONS[option.value] ?? UserRound;
  return { ...option, icon: <Icon className="tw:size-4" /> };
});
export const CIVIL_CARDS = CIVIL_STATUS_OPTIONS.map((option) => {
  const Icon = CIVIL_ICONS[option.value] ?? Heart;
  return { ...option, icon: <Icon className="tw:size-3.5" /> };
});

export function IdentitySection({ draft, set, errors }: SectionProps) {
  const age = computeAge(draft.dateOfBirth);
  const { markTouched, localError } = useTouchedFields();
  return (
    <SectionBlock title="Personal Details" description="Name, gender, civil status, and birth date as shown on the customer's government ID." icon={<UserRound className="tw:size-4" />}>
      <FormGrid>
        <SelectField label="Prefix" value={draft.prefix || undefined} options={PREFIX_OPTIONS} onChange={(value) => set("prefix", value)} allowClear clearLabel="No prefix" placeholder="Search prefix" hint="Optional." />
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
        <div onBlur={() => markTouched("citizenship")}>
          <CitizenshipField draft={draft} set={set} error={errors.citizenship ?? localError("citizenship", draft.citizenship)} />
        </div>
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

/** Searchable citizenship picker: one citizenship, or several when dual/multiple is on (owner instruction 2026-11-20). */
function CitizenshipField({ draft, set, error }: { draft: CustomerDraft; set: SetDraft; error?: string }) {
  const codes = draft.citizenshipCodes;
  const [multi, setMulti] = useState(codes.length > 1);
  const apply = (next: string[]) => {
    const cleaned = [...new Set(next.filter(Boolean))];
    set("citizenshipCodes", cleaned);
    set("citizenship", citizenshipLabels(cleaned));
  };
  const unused = CITIZENSHIP_OPTIONS.filter((option) => !codes.includes(option.value));

  return (
    <div className="tw:flex tw:flex-col tw:gap-3">
      <SelectField
        label="Citizenship"
        value={codes[0]}
        options={CITIZENSHIP_OPTIONS}
        onChange={(value) => apply([value, ...codes.slice(1)])}
        allowClear
        clearLabel="No citizenship yet"
        placeholder="Search country or nationality"
        error={error}
        hint="Fixed reference list; the record stores the country code."
      />
      <CheckboxField
        label="Dual or multiple citizenship"
        checked={multi}
        onChange={setMulti}
      />
      {multi
        ? codes.slice(1).map((code, index) => (
            <SelectField
              key={`${code}-${index + 1}`}
              label={index === 0 ? "Additional citizenship" : `Additional citizenship ${index + 2}`}
              value={code}
              options={CITIZENSHIP_OPTIONS.filter((option) => option.value === code || !codes.includes(option.value))}
              onChange={(value) => apply(codes.map((item, position) => (position === index + 1 ? value : item)))}
              allowClear
              clearLabel="Remove this citizenship"
              placeholder="Search country or nationality"
            />
          ))
        : null}
      {multi && unused.length > 0 ? (
        <SelectField
          label="Add another citizenship"
          value={undefined}
          options={unused}
          onChange={(value) => apply([...codes, value])}
          placeholder="Search country or nationality"
          hint="Choose to append; clear an additional field to remove it."
        />
      ) : null}
    </div>
  );
}

export function ContactSection({ draft, set, errors, newApplication }: SectionProps & { newApplication?: boolean }) {
  const dial = dialingPrefixFor(draft.address.province, draft.address.city);
  const { markTouched, localError } = useTouchedFields();
  return (
    <SectionBlock title="Contact" icon={<Phone className="tw:size-4" />}>
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
    <SectionBlock title="Address" icon={<MapPin className="tw:size-4" />}>
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
  const govIdOptions = useReferenceOptions("gov-id-type", [draft.governmentIdType]);
  return (
    <SectionBlock title="Government ID" icon={<IdCard className="tw:size-4" />}>
      <FormGrid>
        {/* display:contents keeps both ID fields as direct grid cells while the wrapper catches their blur. */}
        <div className="tw:contents" onBlur={(event) => markBlurredField(event, "gov-id-number", "governmentIdNumber", markTouched)}>
          <GovernmentIdFields
            idType={draft.governmentIdType || undefined}
            onIdTypeChange={(value) => set("governmentIdType", value)}
            idNumber={draft.governmentIdNumber}
            onIdNumberChange={(value) => set("governmentIdNumber", value)}
            idTypeOptions={govIdOptions}
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
    <SectionBlock title="Employment" description="Optional" icon={<Briefcase className="tw:size-4" />}>
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
    <SectionBlock title="Secondary Card Holder" description="Gold VIP allows one extra cardholder." icon={<Users className="tw:size-4" />}>
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
  const govIdOptions = useReferenceOptions("gov-id-type", [draft.secGovernmentIdType]);
  return (
    <>
      <SectionBlock title="Personal Details (Extra Cardholder)" description="Name, gender, civil status, and birth date of the secondary card holder as shown on their government ID." icon={<UserRound className="tw:size-4" />}>
        <FormGrid>
          <PersonNameField
            label="First name (Extra cardholder)"
            value={draft.secFirstName}
            onChange={(value) => set("secFirstName", value)}
            onBlur={() => markTouched("firstName")}
            error={errors.supplementaryHolder ?? localSecondaryError("firstName", draft.secFirstName)}
          />
          <MiddleNameField label="Middle name (Extra cardholder)" value={draft.secMiddleName} onChange={(value) => set("secMiddleName", value)} noMiddleName={draft.secNoMiddleName} onNoMiddleNameChange={(value) => set("secNoMiddleName", value)} />
          <PersonNameField
            label="Last name (Extra cardholder)"
            value={draft.secLastName}
            onChange={(value) => set("secLastName", value)}
            onBlur={() => markTouched("lastName")}
            error={localSecondaryError("lastName", draft.secLastName)}
          />
          <SuffixField value={draft.secSuffix} onChange={(value) => set("secSuffix", value)} />
          <TextField
            label="Citizenship (Extra cardholder)"
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
              label="Date of birth (Extra cardholder)"
              value={draft.secDateOfBirth}
              onChange={(value) => set("secDateOfBirth", value)}
              error={localSecondaryError("dateOfBirth", draft.secDateOfBirth)}
            />
          </div>
          <TextField label="Age" value={secAge === null ? "" : String(secAge)} onChange={() => {}} disabled hint="Derived from date of birth." />
        </FormGrid>
        <RadioCardField label="Gender (Extra cardholder)" value={draft.secGender || undefined} options={GENDER_CARDS} onChange={(value) => set("secGender", value)} />
        <RadioCardField label="Civil status (Extra cardholder)" value={draft.secCivilStatus || undefined} options={CIVIL_CARDS} onChange={(value) => set("secCivilStatus", value)} />
      </SectionBlock>
      <SectionBlock title="Address (Extra Cardholder)" icon={<MapPin className="tw:size-4" />}>
        <div onBlur={(event) => markBlurredField(event, "afhomes-street", "street", markTouched)}>
          <PhilippineAddressFields
            value={draft.secAddress}
            onChange={(value) => set("secAddress", value)}
            errors={{ street: localSecondaryError("street", draft.secAddress.street) }}
          />
        </div>
      </SectionBlock>
      <SectionBlock title="Contact (Extra Cardholder)" icon={<Phone className="tw:size-4" />}>
        <FormGrid>
          <PhilippineMobileField
            label="Mobile number (Extra cardholder)"
            fixedPrefix={newApplication}
            value={draft.secMobileNumber}
            onChange={(value) => set("secMobileNumber", value)}
            onBlur={() => markTouched("mobileNumber")}
            error={localSecondaryError("mobileNumber", draft.secMobileNumber)}
          />
          <EmailField
            label="Email (Extra cardholder)"
            value={draft.secEmail}
            onChange={(value) => set("secEmail", value)}
            onBlur={() => markTouched("email")}
            error={localSecondaryError("email", draft.secEmail)}
          />
          <PhilippineLandlineField
            label="Landline (Extra cardholder)"
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
      <SectionBlock title="Government ID (Extra Cardholder)" icon={<IdCard className="tw:size-4" />}>
        <FormGrid>
          {/* display:contents keeps both ID fields as direct grid cells while the wrapper catches their blur. */}
          <div className="tw:contents" onBlur={(event) => markBlurredField(event, "sec-gov-id-number", "governmentIdNumber", markTouched)}>
            <GovernmentIdFields
              idType={draft.secGovernmentIdType || undefined}
              onIdTypeChange={(value) => set("secGovernmentIdType", value)}
              idNumber={draft.secGovernmentIdNumber}
              onIdNumberChange={(value) => set("secGovernmentIdNumber", value)}
              idTypeOptions={govIdOptions}
              idPrefix="sec-gov-id"
              errorIdNumber={localSecondaryError("governmentIdNumber", draft.secGovernmentIdNumber, { idType: draft.secGovernmentIdType })}
            />
          </div>
          <TinField
            label="TIN number (Extra cardholder)"
            maxLength={TIN_DISPLAY_LENGTH}
            value={draft.secTinNumber}
            onChange={(value) => set("secTinNumber", value)}
            onBlur={() => markTouched("tinNumber")}
            error={localSecondaryError("tinNumber", draft.secTinNumber)}
          />
          {idPreview ? <CustomerIdImagePreview preview={idPreview} secondary /> : null}
        </FormGrid>
      </SectionBlock>
      <SectionBlock title="Employment (Extra Cardholder)" description="Optional" icon={<Briefcase className="tw:size-4" />}>
        <FormGrid>
          <TextField
            label="Occupation/Business Name (Extra cardholder)"
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
            label="Type of Business/Industry (Extra cardholder)"
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
            label="Employed Position (Extra cardholder)"
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

function derivedAttributionValue(person: { displayName: string; aaNumber?: string | null } | null): string {
  return person ? attributionPartyLabel(person) : EMPTY_ATTRIBUTION_PARTY;
}

const CUSTOMER_ID_MODE_OPTIONS: ReadonlyArray<{ value: CustomerDraft["customerIdMode"]; label: string }> = [
  { value: "auto", label: "Automatic" },
  { value: "manual", label: "Manual" },
];

export type AttributionSectionProps = SectionProps & {
  /** Sales Network roster: active IST and OST members become the closing seller and referrer options. */
  members: readonly OrgMember[];
  pendingOstIds: ReadonlySet<string> | null;
  accreditationLoading?: boolean;
  /** Customers already on file, used to preview the next automatic Customer ID. */
  existing: readonly Customer[];
  /** Office users (Clerk, Administrator, Super Administrator) choose the closing seller and record the referral reference. */
  office?: boolean;
};

export function AttributionSection({ draft, set, errors, members, existing, pendingOstIds, accreditationLoading, office = false }: AttributionSectionProps) {
  const attributionErrors = customerAttributionErrors(draft, pendingOstIds);
  const referrerId = attributionErrors.referrerMemberId || attributionErrors.recommenderMemberId ? "" : draft.referrerMemberId || draft.recommenderMemberId;
  const closingSellerId = draft.ownerMemberId;
  const accreditationHint = pendingOstIds === null
    ? (accreditationLoading ? "Checking seller accreditation…" : "Seller accreditation is unavailable.")
    : undefined;
  const sellerOptions = useMemo(
    () =>
      members
        .filter((member) => member.status === "active" && pendingOstIds && !pendingOstIds.has(member.id))
        .slice()
        .sort((left, right) => left.displayName.localeCompare(right.displayName))
        .map((member) => ({ value: member.id, label: `${attributionPartyLabel(member)} (${member.designation})` })),
    [members, pendingOstIds],
  );
  const closingSeller = members.find((member) => member.id === closingSellerId);
  const referrer = members.find((member) => member.id === referrerId);
  // Same-team rule (owner instruction 2026-11-20): each list follows the other party's team.
  const closingOptions = useMemo(
    () => (referrer ? sellerOptions.filter((option) => members.find((member) => member.id === option.value)?.branchId === referrer.branchId) : sellerOptions),
    [sellerOptions, members, referrer],
  );
  const referrerOptions = useMemo(
    () => (closingSeller ? sellerOptions.filter((option) => members.find((member) => member.id === option.value)?.branchId === closingSeller.branchId) : sellerOptions),
    [sellerOptions, members, closingSeller],
  );
  const chooseClosingSeller = (value: string) => {
    set("ownerMemberId", value);
    const nextTeam = members.find((member) => member.id === value)?.branchId;
    if (referrer && nextTeam !== referrer.branchId) {
      set("referrerMemberId", "");
      set("recommenderMemberId", "");
    }
  };
  const chooseReferrer = (value: string) => {
    set("referrerMemberId", value);
    set("recommenderMemberId", value);
    const nextTeam = members.find((member) => member.id === value)?.branchId;
    if (closingSeller && nextTeam !== closingSeller.branchId) set("ownerMemberId", "");
  };
  const upline = useMemo(() => sellerUpline(members, closingSellerId), [members, closingSellerId]);
  const sameSeller = Boolean(closingSellerId) && closingSellerId === referrerId;

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
    <SectionBlock title="Sales Attribution" icon={<Handshake className="tw:size-4" />}>
      <FormGrid>
        {office ? (
          <SelectField
            label="Closing seller"
            disabled={pendingOstIds === null}
            error={errors.ownerMemberId}
            value={closingSellerId || undefined}
            options={closingOptions}
            onChange={chooseClosingSeller}
            allowClear
            clearLabel="No closing seller yet"
            placeholder="Type to search sellers"
            hint={accreditationHint ?? "Internal Seller (IST) or Outsourced Seller (OST) in the same team. Required before approval."}
          />
        ) : (
          <TextField label="Closing seller" value={closingSeller ? attributionPartyLabel(closingSeller) : "You (the seller starting this draft)"} onChange={() => {}} disabled hint="The office confirms the closing seller before approval." />
        )}
        <SelectField
          label="Referrer / VIP Recommender"
          disabled={pendingOstIds === null}
          error={attributionErrors.referrerMemberId ?? attributionErrors.recommenderMemberId}
          value={referrerId || undefined}
          options={referrerOptions}
          onChange={chooseReferrer}
          allowClear
          clearLabel="No referrer"
          placeholder="Type to search sellers"
          hint={accreditationHint ?? "Optional. Only teammates of the closing seller are listed; may be the same person, verified with a dated referral."}
        />
        {office && sameSeller ? (
          <TextField
            label="Dated referral reference"
            value={draft.referralReference}
            onChange={(value) => set("referralReference", value)}
            error={errors.referralReference}
            maxLength={120}
            hint="The closing seller is also the referrer. Note the existing dated referral; the approver verifies it."
          />
        ) : null}
        <TextField label="Sales Manager" value={derivedAttributionValue(upline.sm)} onChange={() => {}} disabled />
        <TextField label="Senior Sales Manager" value={derivedAttributionValue(upline.ssm)} onChange={() => {}} disabled />
        <TextField label="Sales Vice Director" value={derivedAttributionValue(upline.svd)} onChange={() => {}} disabled />
      </FormGrid>
      {pendingOstIds === null && (draft.recommenderMemberId || draft.referrerMemberId || (office && draft.ownerMemberId)) ? (
        <div>
          <Button type="button" variant="outline" onClick={() => {
            set("recommenderMemberId", "");
            set("referrerMemberId", "");
            if (office) set("ownerMemberId", "");
          }}>
            Clear Sellers
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
      <RadioCardField label="Acquisition channel (Optional)" value={(draft.acquisitionChannel || undefined) as AcquisitionChannel | undefined} options={ACQUISITION_CHANNELS.map((value) => ({ value, label: value }))} onChange={(value) => set("acquisitionChannel", value)} hint="Optional." />
    </SectionBlock>
  );
}

export function CertificationsSection({ draft, set, errors }: SectionProps) {
  return (
    <SectionBlock title="Certifications" description="Both are required before the application can be submitted.">
      <CheckboxField variant="card" label="The customer consented to the processing of personal data under the Data Privacy Act (RA 10173)." checked={draft.consentDataPrivacy} onChange={(value) => set("consentDataPrivacy", value)} error={errors.consentDataPrivacy} />
      <CheckboxField variant="card" label="A valid government ID with specimen signatures was received." checked={draft.idReceivedCertified} onChange={(value) => set("idReceivedCertified", value)} error={errors.idReceivedCertified} />
    </SectionBlock>
  );
}
