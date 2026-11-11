"use client";

import { listBarangays, listCities, listProvinces, postalFor } from "@/shared/data/philippine-locations";
import {
  MAX_STREET_TEXT,
  MAX_ZIP_LENGTH,
  cleanStreetInput,
  govIdMaxLengthFor,
  govIdPolicyFor,
  uppercaseGovId,
} from "@/shared/utils/input-sanitizers";
import type { AddressValue, FieldOption, OfficeAddressValue } from "@/shared/forms/types";
import { SelectField } from "./select-field";
import { TextField } from "./text-field";

export type GovernmentIdFieldsProps = {
  idType: string | undefined;
  onIdTypeChange: (value: string) => void;
  idNumber: string;
  onIdNumberChange: (value: string) => void;
  idTypeOptions: ReadonlyArray<FieldOption>;
  required?: boolean;
  disabled?: boolean;
  errorType?: string;
  errorIdNumber?: string;
  idPrefix?: string;
};

/** Government ID type + number pair; values are uppercased and filtered by the selected ID type's policy. */
export function GovernmentIdFields({
  idType,
  onIdTypeChange,
  idNumber,
  onIdNumberChange,
  idTypeOptions,
  required,
  disabled,
  errorType,
  errorIdNumber,
  idPrefix = "gov-id",
}: GovernmentIdFieldsProps) {
  return (
    <>
      <SelectField
        id={`${idPrefix}-type`}
        label="Government ID"
        required={required}
        value={idType}
        options={idTypeOptions}
        onChange={onIdTypeChange}
        placeholder="Select ID type"
        disabled={disabled}
        error={errorType}
      />
      <TextField
        id={`${idPrefix}-number`}
        label="ID Number"
        required={required}
        value={idNumber}
        onChange={(next) => onIdNumberChange(uppercaseGovId(next, govIdPolicyFor(idType)))}
        onBlur={() => onIdNumberChange(idNumber.trim())}
        maxLength={govIdMaxLengthFor(idType)}
        inputMode={govIdPolicyFor(idType) === "numeric" ? "numeric" : "text"}
        autoComplete="off"
        disabled={disabled}
        error={errorIdNumber}
      />
    </>
  );
}

export type OfficeAddressFieldsProps = {
  value: OfficeAddressValue;
  onChange: (next: OfficeAddressValue) => void;
  errors?: Partial<Record<"street" | "municipality" | "province" | "postalCode", string>>;
  disabled?: boolean;
  fieldClassName?: string;
};

/**
 * Office address section: No./Street/Subdivision, province, municipality, and ZIP Code,
 * over the PSGC snapshot in `@/shared/data/philippine-locations`.
 *
 * Rules: province comes first (searchable select over every PSGC province) and
 * drives the municipality options via listCities(province); municipality stays
 * disabled until a province is selected. Changing the province clears the
 * municipality + postalCode. ZIP Code is derived and locked: always disabled,
 * filled from postalFor(province, municipality) on municipality/province
 * change, and cleared to "" when no code is known so a previous municipality's
 * ZIP never lingers. All fields optional.
 */
export function OfficeAddressFields({ value, onChange, errors = {}, disabled, fieldClassName }: OfficeAddressFieldsProps) {
  const patch = (key: keyof OfficeAddressValue, next: string) => onChange({ ...value, [key]: next });
  const provinceOptions = listProvinces().map((name) => ({ value: name, label: name }));
  const municipalityOptions = listCities(value.province).map((name) => ({ value: name, label: name }));
  const derivedZip = postalFor(value.province, value.municipality) ?? "";
  return (
    <div className="tw:grid tw:gap-3 tw:sm:grid-cols-2">
      <TextField
        id="afhomes-office-street"
        label="No./Street/Subdivision"
        value={value.street}
        onChange={(next) => patch("street", cleanStreetInput(next))}
        onBlur={() => patch("street", value.street.trim())}
        maxLength={MAX_STREET_TEXT}
        disabled={disabled}
        error={errors.street}
        className={`tw:sm:col-span-2${fieldClassName ? ` ${fieldClassName}` : ""}`}
      />
      <SelectField
        id="afhomes-office-province"
        label="Province"
        value={value.province || undefined}
        options={provinceOptions}
        onChange={(next) => onChange({ ...value, province: next, municipality: "", postalCode: "" })}
        placeholder="Select province"
        showSearch
        disabled={disabled}
        error={errors.province}
        className={fieldClassName}
      />
      <SelectField
        id="afhomes-office-municipality"
        label="Municipality"
        value={value.municipality || undefined}
        options={municipalityOptions}
        onChange={(next) => {
          const postal = postalFor(value.province, next);
          onChange({ ...value, municipality: next, postalCode: postal ?? "" });
        }}
        placeholder={value.province ? "Select municipality" : "Select a province first"}
        showSearch
        disabled={disabled || !value.province}
        error={errors.municipality}
        className={fieldClassName}
      />
      <TextField
        id="afhomes-office-zip"
        label="ZIP Code"
        value={derivedZip}
        onChange={() => {}}
        maxLength={MAX_ZIP_LENGTH}
        inputMode="numeric"
        disabled
        hint="Principal ZIP for the selected municipality."
        error={errors.postalCode}
        className={fieldClassName}
      />
    </div>
  );
}

export type PhilippineAddressFieldsProps = {
  value: AddressValue;
  onChange: (next: AddressValue) => void;
  errors?: Partial<Record<keyof AddressValue, string>>;
  required?: Partial<Record<keyof AddressValue, boolean>>;
  disabled?: boolean;
  fieldClassName?: string;
};

/**
 * Philippine residential address section over the PSGC snapshot
 * (`@/shared/data/philippine-locations`): No./Street/Subdivision (text), Province,
 * City/Municipality, Barangay, and ZIP Code — in province-first dependency
 * order.
 *
 * Rules: the province is chosen first (searchable select over every PSGC
 * province) and drives the city/municipality list via listCities(province);
 * city stays disabled until a province is selected. The city then drives the
 * barangay list via listBarangays(province, city); barangay stays disabled
 * until a city is selected. Province change resets city/barangay/postalCode;
 * city change resets barangay and refills postalCode. ZIP Code is derived and
 * locked: always disabled, filled from postalFor(province, city) on
 * city/province change, cleared to "" when no code is known, and never shown as
 * required. The subdivision is typed inline in the street line; there is no
 * separate subdivision field. AddressValue shape is plain strings.
 */
export function PhilippineAddressFields({ value, onChange, errors = {}, required = {}, disabled, fieldClassName }: PhilippineAddressFieldsProps) {
  const isRequired = (key: keyof AddressValue, fallback: boolean) => required[key] ?? fallback;
  const patch = (key: keyof AddressValue, next: string) => onChange({ ...value, [key]: next });
  const provinceOptions = listProvinces().map((name) => ({ value: name, label: name }));
  const cityOptions = listCities(value.province).map((name) => ({ value: name, label: name }));
  const barangayOptions = listBarangays(value.province, value.city).map((name) => ({ value: name, label: name }));
  const derivedZip = postalFor(value.province, value.city) ?? "";
  return (
    <div className="tw:grid tw:grid-cols-1 tw:gap-3 tw:sm:grid-cols-2">
      <TextField
        id="afhomes-street"
        label="No./Street/Subdivision"
        required={isRequired("street", true)}
        value={value.street}
        onChange={(next) => patch("street", cleanStreetInput(next))}
        onBlur={() => patch("street", value.street.trim())}
        maxLength={MAX_STREET_TEXT}
        disabled={disabled}
        error={errors.street}
        className={`tw:sm:col-span-2${fieldClassName ? ` ${fieldClassName}` : ""}`}
      />
      <SelectField
        id="afhomes-province"
        label="Province"
        required={isRequired("province", true)}
        value={value.province || undefined}
        options={provinceOptions}
        onChange={(next) => onChange({ ...value, province: next, city: "", barangay: "", postalCode: "" })}
        placeholder="Select province"
        showSearch
        disabled={disabled}
        error={errors.province}
        className={fieldClassName}
      />
      <SelectField
        id="afhomes-city"
        label="City/Municipality"
        required={isRequired("city", true)}
        value={value.city || undefined}
        options={cityOptions}
        onChange={(next) => {
          const postal = postalFor(value.province, next);
          onChange({ ...value, city: next, barangay: "", postalCode: postal ?? "" });
        }}
        placeholder={value.province ? "Select city" : "Select a province first"}
        showSearch
        disabled={disabled || !value.province}
        error={errors.city}
        className={fieldClassName}
      />
      <SelectField
        id="afhomes-barangay"
        label="Barangay"
        required={isRequired("barangay", true)}
        value={value.barangay || undefined}
        options={barangayOptions}
        onChange={(next) => patch("barangay", next)}
        placeholder={value.city ? "Select barangay" : "Select a city first"}
        showSearch
        disabled={disabled || !value.city}
        error={errors.barangay}
        className={fieldClassName}
      />
      <TextField
        id="afhomes-zip"
        label="ZIP Code"
        required={false}
        value={derivedZip}
        onChange={() => {}}
        maxLength={MAX_ZIP_LENGTH}
        inputMode="numeric"
        disabled
        hint="Principal ZIP for the selected city."
        error={errors.postalCode}
        className={fieldClassName}
      />
    </div>
  );
}
