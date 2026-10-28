import type { AccreditationClassification } from "@/modules/accreditation/types";

export type AaIdentifierParts = {
  prefix: "AAI" | "AAO";
  yymm: string;
  sequence: string;
};

export type AaValidationResult =
  | { ok: true; parts: AaIdentifierParts }
  | { ok: false; reason: "MALFORMED" | "BAD_MONTH" | "SHORT_SEQUENCE" };

const AA_RE = /^AA([IO])(\d{4})(\d{4,})$/;

export function validateExistingAaIdentifier(value: string | null | undefined): AaValidationResult {
  if (!value) return { ok: false, reason: "MALFORMED" };
  const match = AA_RE.exec(value.trim().toUpperCase());
  if (!match) return { ok: false, reason: "MALFORMED" };
  const month = Number(match[2].slice(2, 4));
  if (month < 1 || month > 12) return { ok: false, reason: "BAD_MONTH" };
  if (match[3].length < 4) return { ok: false, reason: "SHORT_SEQUENCE" };
  return {
    ok: true,
    parts: { prefix: `AA${match[1]}` as "AAI" | "AAO", yymm: match[2], sequence: match[3] },
  };
}

export function aaClassificationFor(prefix: "AAI" | "AAO"): AccreditationClassification {
  return prefix === "AAI" ? "IST" : "OST";
}

export function isAaIdentifierCompatible(value: string | null | undefined, classification: AccreditationClassification): boolean {
  const result = validateExistingAaIdentifier(value);
  if (!result.ok) return false;
  return aaClassificationFor(result.parts.prefix) === classification;
}
