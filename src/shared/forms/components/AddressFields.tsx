"use client";

import { cleanTitleInput, MAX_CITY_LENGTH, MAX_ZIP_LENGTH } from "@/shared/utils/input-sanitizers";
import { normalizePostalCode } from "@/shared/forms/formatting/phone";
import { TextField } from "./TextField";
import type { AddressValue } from "../types";
import "./fields.css";

export type PhilippineAddressFieldsProps = {
  value: AddressValue;
  onChange: (next: AddressValue) => void;
  errors?: Partial<Record<keyof AddressValue, string>>;
  required?: Partial<Record<keyof AddressValue, boolean>>;
  disabled?: boolean;
  fieldClassName?: string;
};

/**
 * Reusable Philippine address section: street, province, city, barangay,
 * subdivision (optional), and 4-digit ZIP. Uses validated text inputs;
 * switch to reference-data selects only when an approved dataset exists.
 */
export function PhilippineAddressFields({
  value,
  onChange,
  errors = {},
  required = {},
  disabled,
  fieldClassName,
}: PhilippineAddressFieldsProps) {
  const isRequired = (key: keyof AddressValue, fallback: boolean) =>
    required[key] ?? fallback;
  const patch = (key: keyof AddressValue, next: string) =>
    onChange({ ...value, [key]: next });

  return (
    <>
      <div className={`afhomes-address-grid__full${fieldClassName ? ` ${fieldClassName}` : ""}`}>
        <TextField
          id="afhomes-street"
          label="Street Address"
          required={isRequired("street", true)}
          value={value.street}
          onChange={(next) => patch("street", next)}
          onBlur={() => patch("street", value.street.trim())}
          maxLength={160}
          disabled={disabled}
          error={errors.street}
        />
      </div>
      <div className="afhomes-address-grid">
        <TextField
          id="afhomes-province"
          label="Province"
          required={isRequired("province", true)}
          value={value.province}
          onChange={(next) => patch("province", cleanTitleInput(next))}
          onBlur={() => patch("province", value.province.trim())}
          maxLength={MAX_CITY_LENGTH}
          disabled={disabled}
          error={errors.province}
          className={fieldClassName}
        />
        <TextField
          id="afhomes-city"
          label="City"
          required={isRequired("city", true)}
          value={value.city}
          onChange={(next) => patch("city", cleanTitleInput(next))}
          onBlur={() => patch("city", value.city.trim())}
          maxLength={MAX_CITY_LENGTH}
          disabled={disabled}
          error={errors.city}
          className={fieldClassName}
        />
        <TextField
          id="afhomes-barangay"
          label="Barangay"
          required={isRequired("barangay", true)}
          value={value.barangay}
          onChange={(next) => patch("barangay", cleanTitleInput(next))}
          onBlur={() => patch("barangay", value.barangay.trim())}
          maxLength={MAX_CITY_LENGTH}
          disabled={disabled}
          error={errors.barangay}
          className={fieldClassName}
        />
        <TextField
          id="afhomes-subdivision"
          label="Subdivision"
          required={isRequired("subdivision", false)}
          value={value.subdivision}
          onChange={(next) => patch("subdivision", cleanTitleInput(next))}
          onBlur={() => patch("subdivision", value.subdivision.trim())}
          maxLength={120}
          disabled={disabled}
          error={errors.subdivision}
          className={fieldClassName}
        />
        <TextField
          id="afhomes-zip"
          label="ZIP Code"
          required={isRequired("postalCode", true)}
          value={value.postalCode}
          onChange={(next) => patch("postalCode", normalizePostalCode(next))}
          onBlur={() => patch("postalCode", value.postalCode.trim())}
          maxLength={MAX_ZIP_LENGTH}
          inputMode="numeric"
          disabled={disabled}
          error={errors.postalCode}
          className={fieldClassName}
        />
      </div>
    </>
  );
}
