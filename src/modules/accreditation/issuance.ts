import type { AccreditationRecord } from "@/modules/accreditation/types";
import type { OrgMember } from "@/modules/organization/types";
import { parseManilaDateOnly } from "@/modules/accreditation/dates";

export type AaPrefix = "AAI" | "AAO";

/** YYMM derived from an official original accreditation date (YYYY-MM-DD). */
export function toAaYearMonth(dateOnly: string): string | null {
  const parts = parseManilaDateOnly(dateOnly);
  if (!parts) return null;
  return `${String(parts.year).slice(2)}${String(parts.month).padStart(2, "0")}`;
}

/** Render the four-digit sequence for an issued AA number. */
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

/** Allocate the next unused sequence shared across seller classifications for this month. */
export function allocateSharedAaNumber(
  prefix: AaPrefix,
  yymm: string,
  reserved: ReadonlySet<string>,
): { aaNumber: string; sequence: number } {
  const used = new Set<number>();
  for (const number of reserved) {
    const match = /^(?:AA[IO]|AI)(\d{4})(\d{4,})$/.exec(number);
    if (match?.[1] === yymm) used.add(Number(match[2]));
  }
  for (let sequence = 1; sequence <= 9999; sequence += 1) {
    if (!used.has(sequence)) return { aaNumber: buildAaNumber(prefix, yymm, sequence), sequence };
  }
  throw new Error("Shared AA sequence exhausted.");
}
