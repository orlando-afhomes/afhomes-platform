import type { Contract } from "@/modules/contracts/types";
import type { Payment } from "@/modules/finance/types";
import { isFullySettled } from "@/modules/finance/rules";
import { isValidTierCode } from "@/modules/vip/types";
import { addYearsToDate, parseManilaDateOnly } from "@/shared/lib/dates";

/** Validity end date: activation date plus the contract validity years (boundary convention pending, D12). */
export function computeValidityEnd(activationDate: string, validityYears: number): string | null {
  return addYearsToDate(activationDate, validityYears);
}

export function buildVipNumber(date: string, sequence: number, tierCode: string, paymentCode: string | null, classification: "S" | "N"): string {
  if (!parseManilaDateOnly(date) || !Number.isInteger(sequence) || sequence < 1 || sequence > 99_999) throw new Error("A VIP Number cannot be issued for this date and sequence.");
  if (!isValidTierCode(tierCode) || !paymentCode || !/^(C01|T(0[1-9]|[12][0-9]|3[0-6]))$/.test(paymentCode)) {
    throw new Error("The contract needs an approved card level and payment code before issuing a VIP Number.");
  }
  return `${date.slice(2).replaceAll("-", "")}${String(sequence).padStart(5, "0")}${tierCode}${paymentCode}${classification}`;
}

export type ActivationCheck = { eligible: boolean; reasons: string[] };

/** Activation needs a finalized contract, full verified settlement, and a valid RA (06 sections 4.1 and 7.1). */
export function checkActivationEligibility(contract: Contract, payments: readonly Payment[]): ActivationCheck {
  const reasons: string[] = [];
  if (contract.status !== "finalized") reasons.push("The contract is not finalized.");
  if (!isFullySettled(contract, payments)) reasons.push("Full payment has not been Finance-verified.");
  if (!contract.vipNumber) reasons.push("The VIP Number must be issued before activation.");
  if (!contract.paymentCode) reasons.push("The payment plan has no documented payment code (part of the VIP Number).");
  return { eligible: reasons.length === 0, reasons };
}
