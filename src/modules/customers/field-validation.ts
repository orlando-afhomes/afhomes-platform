/**
 * Per-field (blur) validation for the customer application form.
 *
 * Every rule delegates to the canonical validator that Submit also uses, so
 * field feedback and submit errors can never drift apart. Field-level checks
 * never turn an empty optional value into an error, and requiredness that only
 * applies when the whole form is submitted (province/city/barangay) stays out
 * of blur feedback.
 */
import { validatePostalCode } from "@/shared/forms/validation/address";
import { validateLandline, validateMobileNumber } from "@/shared/forms/validation/contact";
import { validateCitizenship, validateGovIdNumber, validateTinNumber } from "@/shared/forms/validation/identification";
import { validatePersonName, validateSuffix } from "@/shared/forms/validation/person-name";
import { computeAge } from "@/shared/lib/dates";
import { isValidEmail, MAX_ADDRESS_LENGTH, MAX_BUSINESS_TEXT } from "@/shared/utils/input-sanitizers";

export type CustomerFieldContext = { idType?: string | null; today?: string; areaCode?: string | null };

const EMAIL_MESSAGE = "Enter a valid email address.";
const BIRTH_DATE_MESSAGE = "Enter a valid date of birth.";
const SECONDARY_NAME_MESSAGE = "Enter the supplementary holder's first and last name.";
const MAX_AGE = 120;

/**
 * Birth date is a calendar date in the past; `computeAge` also rejects
 * impossible dates and future values. The same message covers a missing
 * required value and an implausible age (over 120 years).
 */
function validateBirthDate(value: string, today: string | undefined, required: boolean): string | null {
  if (!value.trim()) return required ? BIRTH_DATE_MESSAGE : null;
  const age = computeAge(value, today);
  if (age === null || age > MAX_AGE) return BIRTH_DATE_MESSAGE;
  return null;
}

/** Live cleaning already prevents bad characters and truncates; this is a format guard only. */
function validateBusinessText(value: string, label: string): string | null {
  if (value.trim().length > MAX_BUSINESS_TEXT) {
    return `${label} must be ${MAX_BUSINESS_TEXT} characters or fewer.`;
  }
  return null;
}

function validateOptionalEmail(value: string): string | null {
  if (!value.trim()) return null;
  return isValidEmail(value) ? null : EMAIL_MESSAGE;
}

/**
 * Secondary names are optional, but a started profile needs both names
 * (04 section 7.3.1). A single per-field call cannot see the sibling name, so
 * the form can pass the combined `name` key (`"Ben Cruz"`) to check the pair;
 * Submit still rechecks with `validateSupplementaryHolder`.
 */
function validateSecondaryNamePair(value: string): string | null {
  if (!value.trim()) return null;
  const parts = value.trim().split(/\s+/);
  if (parts.length < 2) return SECONDARY_NAME_MESSAGE;
  const first = parts[0];
  const last = parts[parts.length - 1];
  return validatePersonName(first, "First name", { required: true }) ?? validatePersonName(last, "Last name", { required: true });
}

/** Primary customer fields. Unknown keys and submit-only address fields return null. */
export function validateCustomerField(key: string, value: string, ctx?: CustomerFieldContext): string | null {
  switch (key) {
    case "mobileNumber":
      return validateMobileNumber(value);
    case "landline":
      return validateLandline(value, ctx?.areaCode);
    case "tinNumber":
      return validateTinNumber(value);
    case "governmentIdNumber":
      return value.trim() ? validateGovIdNumber(value, ctx?.idType ?? undefined) : null;
    case "citizenship":
      return validateCitizenship(value);
    case "email":
      return validateOptionalEmail(value);
    // `validatePersonName` is the shared wrapper around the cleanPersonNameInput
    // allowlist (letters, spaces, hyphens, apostrophes, periods) and MAX_NAME_LENGTH.
    case "firstName":
      return validatePersonName(value, "First name", { required: true });
    case "middleName":
      return validatePersonName(value, "Middle name", { required: false });
    case "lastName":
      return validatePersonName(value, "Last name", { required: true });
    case "suffix":
      return validateSuffix(value);
    case "dateOfBirth":
      return validateBirthDate(value, ctx?.today, true);
    case "postalCode":
      return value.trim() ? validatePostalCode(value) : null;
    case "street":
      return value.trim().length > MAX_ADDRESS_LENGTH ? "Street address must be 2 to 160 characters." : null;
    case "occupation":
      return validateBusinessText(value, "Occupation/Business Name");
    case "businessIndustry":
      return validateBusinessText(value, "Type of Business/Industry");
    case "employedPosition":
      return validateBusinessText(value, "Employed Position");
    // Requiredness is enforced as a group at Submit; a lone blur must not flag it.
    case "barangay":
    case "province":
    case "city":
      return null;
    default:
      return null;
  }
}

/**
 * Supplementary (secondary) holder fields. The profile itself is optional
 * (04 section 7.3.1), so blank values never produce an error; formats and
 * messages are identical to the primary fields once a value is present.
 */
export function validateSecondaryField(key: string, value: string, ctx?: CustomerFieldContext): string | null {
  switch (key) {
    case "name":
      return validateSecondaryNamePair(value);
    case "firstName":
      return validatePersonName(value, "First name", { required: false });
    case "lastName":
      return validatePersonName(value, "Last name", { required: false });
    case "middleName":
      return validatePersonName(value, "Middle name", { required: false });
    case "suffix":
      return validateSuffix(value);
    case "dateOfBirth":
      return validateBirthDate(value, ctx?.today, false);
    default:
      if (!value.trim()) return null;
      return validateCustomerField(key, value, ctx);
  }
}
