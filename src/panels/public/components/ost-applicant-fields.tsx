"use client";

import type { RegistrationApplicant } from "@/modules/accreditation/types";
import type { ApplicantErrors } from "@/modules/accreditation/registration";
import { FormGrid } from "@/shared/components/modern/form-layout";
import {
  EmailField,
  MiddleNameField,
  PersonNameField,
  PhilippineAddressFields,
  PhilippineMobileField,
  StandardDateField,
  SuffixField,
} from "@/shared/forms/modern";

type FieldsProps = {
  value: RegistrationApplicant;
  onChange: (patch: Partial<RegistrationApplicant>) => void;
  errors: ApplicantErrors;
};

/** Name, contact and birth date of the OST applicant. Shared by the application and the private correction page. */
export function ApplicantPersonalFields({ value, onChange, errors }: FieldsProps) {
  return (
    <FormGrid>
      <PersonNameField id="applicant-first-name" label="First name" required value={value.firstName} onChange={(firstName) => onChange({ firstName })} error={errors.firstName} autoComplete="given-name" />
      <MiddleNameField
        id="applicant-middle-name"
        label="Middle name"
        required
        value={value.middleName}
        onChange={(middleName) => onChange({ middleName })}
        noMiddleName={value.noMiddleName}
        onNoMiddleNameChange={(noMiddleName) => onChange({ noMiddleName })}
        error={errors.middleName}
      />
      <PersonNameField id="applicant-last-name" label="Last name" required value={value.lastName} onChange={(lastName) => onChange({ lastName })} error={errors.lastName} autoComplete="family-name" />
      <SuffixField id="applicant-suffix" value={value.suffix || undefined} onChange={(suffix) => onChange({ suffix })} error={errors.suffix} />
      <PhilippineMobileField id="applicant-mobile" label="Mobile number" required value={value.mobileNumber} onChange={(mobileNumber) => onChange({ mobileNumber })} placeholder="09xx xxx xxxx" error={errors.mobileNumber} />
      <StandardDateField id="applicant-birth-date" label="Birth date" required value={value.dateOfBirth} onChange={(dateOfBirth) => onChange({ dateOfBirth })} error={errors.dateOfBirth} />
      <EmailField id="applicant-email" label="Email address" required value={value.email} onChange={(email) => onChange({ email })} error={errors.email} className="tw:sm:col-span-2" autoComplete="email" />
    </FormGrid>
  );
}

export function ApplicantAddressFields({ value, onChange, errors }: FieldsProps) {
  return (
    <PhilippineAddressFields
      value={{ street: value.street, province: value.province, city: value.city, barangay: value.barangay, postalCode: value.postalCode }}
      onChange={onChange}
      errors={{ street: errors.street, province: errors.province, city: errors.city, barangay: errors.barangay, postalCode: errors.postalCode }}
    />
  );
}
