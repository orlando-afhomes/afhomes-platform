import type { AccreditationRecord } from "@/modules/accreditation/types";
import type { OrgMember } from "@/modules/organization/types";
import { parseManilaDateOnly } from "@/modules/accreditation/dates";
import { validateExistingAaIdentifier } from "@/modules/accreditation/identifiers";

export type AaPrefix = "AAI" | "AAO";

/** YYMM derived from an official original accreditation date (YYYY-MM-DD). */
export function toAaYearMonth(dateOnly: string): string | null {
  const parts = parseManilaDateOnly(dateOnly);
  if (!parts) return null;
  return `${String(parts.year).slice(2)}${String(parts.month).padStart(2, "0")}`;
}

/** Shared sequence rendered with at least four digits; grows past 9999. */
export function formatSharedSequence(sequence: number): string {
  return String(Math.max(1, Math.floor(sequence))).padStart(4, "0");
}

export function buildAaNumber(prefix: AaPrefix, yymm: string, sequence: number): string {
  return `${prefix}${yymm}${formatSharedSequence(sequence)}`;
}

/** Every AA identifier already reserved in mock state (uppercased). */
export function collectReservedAaNumbers(
  accreditations: readonly AccreditationRecord[],
  members: readonly OrgMember[],
): Set<string> {
  const reserved = new Set<string>();
  for (const record of accreditations) {
    if (record.aaNumber) reserved.add(record.aaNumber.trim().toUpperCase());
    // Numbers replaced by a renewal stay reserved: they are never reissued (doc 03 section 5.2.1).
    for (const entry of record.aaNumberHistory ?? []) reserved.add(entry.aaNumber.trim().toUpperCase());
  }
  for (const member of members) {
    if (member.aaNumber) reserved.add(member.aaNumber.trim().toUpperCase());
  }
  return reserved;
}

/**
 * Allocate the next unused shared-sequence AA number. Pure: the caller owns
 * committing the consumed sequence so a failed creation consumes nothing.
 */
export function allocateSharedAaNumber(
  prefix: AaPrefix,
  yymm: string,
  reserved: ReadonlySet<string>,
  startSequence: number,
): { aaNumber: string; sequence: number } {
  let sequence = Math.max(1, Math.floor(startSequence));
  for (let attempts = 0; attempts < 100000; attempts += 1) {
    const candidate = buildAaNumber(prefix, yymm, sequence);
    if (!reserved.has(candidate.toUpperCase())) {
      return { aaNumber: candidate, sequence };
    }
    sequence += 1;
  }
  throw new Error("Shared AA sequence exhausted.");
}

/**
 * Validate a manually entered AA number against the canonical contract.
 * Returns the first error or null. Historical reservations are enforced via
 * the reserved set; classification and YYMM must match the active workflow.
 */
export function validateManualAaNumber(
  value: string,
  prefix: AaPrefix,
  approvedStart: string,
  reserved: ReadonlySet<string>,
): string | null {
  const trimmed = value.trim().toUpperCase();
  if (!trimmed) return "AA number required in Manual.";
  const parsed = validateExistingAaIdentifier(trimmed);
  if (!parsed.ok) {
    if (parsed.reason === "BAD_MONTH") return "AA number has invalid month.";
    if (parsed.reason === "SHORT_SEQUENCE") return "AA sequence needs four digits.";
    return "Invalid AA format.";
  }
  if (parsed.parts.prefix !== prefix) {
    return `AA must start with ${prefix}.`;
  }
  const expectedYyMm = toAaYearMonth(approvedStart);
  if (!expectedYyMm) return "Approved Start must be a valid date.";
  if (parsed.parts.yymm !== expectedYyMm) {
    return "AA YYMM must match start.";
  }
  if (reserved.has(trimmed)) return "AA number already reserved.";
  return null;
}
