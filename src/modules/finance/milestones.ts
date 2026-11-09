import { payoutReleaseDate, payoutThresholdDate } from "@/modules/commissions/rules";
import type { Contract } from "@/modules/contracts/types";
import { manilaDateOf } from "@/shared/lib/dates";
import { buildCollectionLedger, isFullySettled } from "./rules";
import type { Payment } from "./types";

export type Milestone = { key: string; label: string; date: string | null; note?: string };

/**
 * The distinct financial milestones of one contract, kept separate (07 sections 9 to 12):
 * recorded, verified, sale confirmed, commission release threshold, fully paid,
 * membership activated. Verification never activates a membership, and a Closed
 * Deal threshold is not a milestone here because it gates nothing (not canonical).
 * Dates are Asia/Manila business dates; null means not reached.
 */
export function deriveMilestones(input: {
  contract: Pick<Contract, "priceCentavos">;
  payments: readonly Payment[];
  saleConfirmedDate: string | null;
  activationDate: string | null;
  cardId: string | null;
}): Milestone[] {
  const { contract, payments } = input;
  const recorded = payments.map((payment) => manilaDateOf(payment.submittedAt)).sort()[0] ?? null;
  const verified = payments.map((payment) => payment.verifiedDate).filter((date): date is string => Boolean(date)).sort()[0] ?? null;
  const threshold = payoutThresholdDate(contract, payments);
  const release = payoutReleaseDate(contract, payments);
  const ledger = buildCollectionLedger(contract, payments);
  return [
    { key: "recorded", label: "Payment recorded", date: recorded },
    { key: "verified", label: "Payment verified by Finance", date: verified },
    { key: "sale", label: "Sale confirmed", date: input.saleConfirmedDate },
    { key: "release", label: "Commission release threshold reached", date: threshold, note: release ? `Payout opens ${release}` : undefined },
    { key: "paid", label: "Fully paid", date: isFullySettled(contract, payments) ? (ledger.at(-1)?.date ?? null) : null },
    { key: "activated", label: "Membership activated", date: input.activationDate },
    { key: "card", label: "Card ID issued", date: input.cardId ? input.activationDate : null, note: input.cardId ?? undefined },
  ];
}
