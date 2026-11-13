import { ACCREDITATION_REMINDER_LABELS } from "@/modules/accreditation/dates";
import { getCurrentAccreditationRecord, getSellerStanding } from "@/modules/accreditation/eligibility";
import type { AccreditationRecord } from "@/modules/accreditation/types";
import type { SaleExpiryReminder } from "./types";

export type SaleParty = { role: SaleExpiryReminder["role"]; memberId: string | null | undefined };

export type SalePartyBlock = { role: SaleExpiryReminder["role"]; memberId: string; reason: "SUSPENDED" | "ENDED" };

const ROLE_LABELS: Record<SaleExpiryReminder["role"], string> = { seller: "salesperson", referrer: "referrer" };

/**
 * Doc 03 section 9 (owner ruling R3, OCT R28 and R37): for a new sale, an expired salesperson or
 * referrer is never blocked, and the reminder is recorded on the sale. Only a suspension on or
 * before the sale date, or a resignation or termination before it, blocks. A party with no
 * accreditation record is not judged here (seeded fixtures and Company sales).
 */
export function evaluateSaleParties(
  parties: readonly SaleParty[],
  accreditations: readonly AccreditationRecord[],
  saleDate: string,
): { blocked: SalePartyBlock[]; reminders: SaleExpiryReminder[] } {
  const blocked: SalePartyBlock[] = [];
  const reminders: SaleExpiryReminder[] = [];
  for (const party of parties) {
    if (!party.memberId) continue;
    const current = getCurrentAccreditationRecord(accreditations.filter((record) => record.memberId === party.memberId));
    if (!current) continue;
    const standing = getSellerStanding(current, saleDate);
    if (standing.state === "expired") {
      reminders.push({ role: party.role, memberId: party.memberId, expiryDate: standing.expiryDate, reminder: standing.reminder });
    } else if (standing.state === "blocked" && (standing.reason === "SUSPENDED" || standing.reason === "ENDED")) {
      blocked.push({ role: party.role, memberId: party.memberId, reason: standing.reason });
    }
  }
  return { blocked, reminders };
}

export function salePartyBlockMessage(block: SalePartyBlock): string {
  return block.reason === "SUSPENDED"
    ? `The ${ROLE_LABELS[block.role]} is suspended, so a new sale cannot be recorded for this date.`
    : `The ${ROLE_LABELS[block.role]} has resigned or been terminated, so a new sale cannot be recorded for this date.`;
}

/** Plain-language reminder shown beside the sale. */
export function saleExpiryReminderText(reminder: SaleExpiryReminder): string {
  const who = reminder.role === "seller" ? "Salesperson" : "Referrer";
  return `${who} accreditation expired on ${reminder.expiryDate} (${ACCREDITATION_REMINDER_LABELS[reminder.reminder]}). Renewal reminder.`;
}
