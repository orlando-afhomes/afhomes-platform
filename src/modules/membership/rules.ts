import type { Contract } from "@/modules/contracts/types";
import type { Payment } from "@/modules/finance/types";
import { isFullySettled } from "@/modules/finance/rules";
import { isValidTierCode } from "@/modules/vip/types";
import { addYearsToDate, parseManilaDateOnly } from "@/shared/lib/dates";

/**
 * RA sequence: the trailing four-digit NNNN sequence of the Reservation
 * Agreement reference (for example 2027-0001 gives 0001). The source sequence
 * is exactly four digits (06 section 6.2); shorter forms are rejected rather
 * than padded, so two spellings cannot map to one Card ID sequence. The RA
 * numbering scope is an open decision (D2, D11), so no other pattern is assumed.
 */
export function extractRaSequence(raNumber: string | null | undefined): string | null {
  if (!raNumber) return null;
  const match = /^[A-Za-z0-9]{1,12}-(\d{4})$/.exec(raNumber.trim());
  return match ? match[1] : null;
}

export type CardIdParts = {
  activationDate: string;
  raNumber: string | null;
  tierCode: string;
  paymentCode: string | null;
  classification: "S" | "N";
};

/**
 * VIP Card ID YYMMDDNNNNNVTPMMS (06 section 6): activation date YYMMDD, five-digit
 * RA sequence (four digits with one leading zero), tier code, payment code
 * (C01, T04), and S/N classification. Returns an error text instead of guessing.
 */
export function buildCardId(parts: CardIdParts): { cardId: string } | { error: string } {
  const date = parseManilaDateOnly(parts.activationDate);
  if (!date) return { error: "The activation date is not a valid date." };
  const sequence = extractRaSequence(parts.raNumber);
  if (!sequence) return { error: "A valid RA number is required before a Card ID can be issued." };
  if (!parts.paymentCode || !/^[CT]\d{2}$/.test(parts.paymentCode)) return { error: "The payment scheme has no documented Card ID payment code." };
  if (!/^[A-Z]\d$/.test(parts.tierCode)) return { error: "The tier code does not fit the 2-character segment." };
  const yy = String(date.year).slice(2);
  const mm = String(date.month).padStart(2, "0");
  const dd = String(date.day).padStart(2, "0");
  const cardId = `${yy}${mm}${dd}0${sequence}${parts.tierCode}${parts.paymentCode}${parts.classification}`;
  return cardId.length === 17 ? { cardId } : { error: "The Card ID is not 17 characters." };
}

/** Validity end date: activation date plus the contract validity years (boundary convention pending, D12). */
export function computeValidityEnd(activationDate: string, validityYears: number): string | null {
  return addYearsToDate(activationDate, validityYears);
}

export function buildVipNumber(date: string, sequence: number, tierCode: string, paymentCode: string | null, classification: "S" | "N"): string {
  if (!parseManilaDateOnly(date) || !Number.isInteger(sequence) || sequence < 1 || sequence > 99_999) throw new Error("A VIP Number cannot be issued for this date and sequence.");
  if (!isValidTierCode(tierCode) || !paymentCode || !/^(C01|T(0[1-9]|[12][0-9]|3[0-6]))$/.test(paymentCode)) {
    throw new Error("The contract needs an approved tier and payment code before issuing a VIP Number.");
  }
  return `${date.slice(2).replaceAll("-", "")}${String(sequence).padStart(5, "0")}${tierCode}${paymentCode}${classification}`;
}

export type ActivationCheck = { eligible: boolean; reasons: string[] };

/** Activation needs a finalized contract, full verified settlement, and a valid RA (06 sections 4.1 and 7.1). */
export function checkActivationEligibility(contract: Contract, payments: readonly Payment[]): ActivationCheck {
  const reasons: string[] = [];
  if (contract.status !== "finalized") reasons.push("The contract is not finalized.");
  if (!isFullySettled(contract, payments)) reasons.push("Full payment has not been Finance-verified.");
  if (!contract.vipNumber) reasons.push("Record the signed Reservation Agreement to issue the VIP Number.");
  if (!contract.paymentCode) reasons.push("The payment scheme has no documented Card ID payment code.");
  return { eligible: reasons.length === 0, reasons };
}
