/**
 * Payment reference numbers (docs/business-rules/07). Reference format depends
 * on the payment method: e-wallets use a compact uppercase code, bank transfers
 * use a compact uppercase code with a wider length, and cheques keep the
 * separators printed on the cheque.
 */
export type ReferencePolicy = "digital" | "bank" | "cheque";

export const REFERENCE_LIMITS: Record<ReferencePolicy, { min: number; max: number }> = {
  digital: { min: 12, max: 16 },
  bank: { min: 6, max: 20 },
  cheque: { min: 3, max: 30 },
};

const REFERENCE_MESSAGES: Record<ReferencePolicy, string> = {
  digital: "E-wallet references must be 12 to 16 letters or digits, uppercase, with no spaces or symbols.",
  bank: "Bank references must be 6 to 20 letters or digits, uppercase, with no spaces or symbols.",
  cheque: "Cheque references must be 3 to 30 characters using letters, digits, spaces, commas, periods, slashes, or hyphens.",
};

/** E-wallet methods; every other method falls back to the bank policy. */
const DIGITAL_METHODS: ReadonlyArray<string> = ["gcash", "maya"];
const CHEQUE_METHODS: ReadonlyArray<string> = ["cheque", "check"];

/** Reference policy for a payment method, matched case-insensitively. */
export function referencePolicyFor(method: string): ReferencePolicy {
  const key = method.trim().toLowerCase();
  if (DIGITAL_METHODS.includes(key)) return "digital";
  if (CHEQUE_METHODS.includes(key)) return "cheque";
  // Bank Transfer, Card, Cash (no reference), and unknown methods use the bank policy.
  return "bank";
}

/** E-wallet and bank references keep letters and digits only. */
const COMPACT_REFERENCE_RE = /[^A-Z0-9]/g;
/** Cheque references keep the separators printed on the cheque. */
const CHEQUE_REFERENCE_RE = /[^A-Z0-9 ,./-]/g;
const REPEATED_SPACES_RE = / {2,}/g;

/**
 * Uppercase and filter the value without applying the length cap, so callers
 * can measure what the user actually entered before display truncation.
 * Nothing is trimmed: a trailing space is kept so typing stays natural, and
 * measurement trims separately.
 */
function filterReference(value: string, policy: ReferencePolicy): string {
  const upper = value.toUpperCase();
  if (policy === "cheque") {
    return upper.replace(CHEQUE_REFERENCE_RE, "").replace(REPEATED_SPACES_RE, " ");
  }
  return upper.replace(COMPACT_REFERENCE_RE, "");
}

/**
 * Normalize a reference number for storage: uppercase, strip characters the
 * policy does not allow, collapse repeated spaces for cheques, and cap at the
 * policy maximum so the result never exceeds it.
 */
export function cleanReferenceNumber(value: string, policy: ReferencePolicy): string {
  const max = REFERENCE_LIMITS[policy].max;
  const kept = filterReference(value, policy);
  return kept.slice(0, max);
}

/**
 * Optional reference number. Blank values are allowed; otherwise the
 * normalized value must fall inside the policy length range. The uncapped
 * normalized length is measured so an over-long reference is rejected instead
 * of being accepted after silent truncation.
 */
export function validateReferenceNumber(value: string, policy: ReferencePolicy): string | null {
  if (!value.trim()) return null;
  const cleaned = filterReference(value, policy).trim();
  const { min, max } = REFERENCE_LIMITS[policy];
  if (cleaned.length < min || cleaned.length > max) return REFERENCE_MESSAGES[policy];
  return null;
}
