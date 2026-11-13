import type { Contract } from "@/modules/contracts/types";
import { manilaDateOf } from "@/shared/lib/dates";
import { approvedCollectionMilestone } from "./rules";
import type { Payment } from "./types";

export type Milestone = { key: string; label: string; date: string | null; note?: string };

/**
 * The distinct financial milestones of one contract, kept separate (07 sections 9 to 12):
 * recorded, verified, sale confirmed, commission release threshold, fully paid,
 * membership activated. Verification never activates a membership.
 * Dates are Asia/Manila business dates; null means not reached.
 */
export function deriveMilestones(input: {
  contract: Pick<Contract, "priceCentavos">;
  payments: readonly Payment[];
  saleConfirmedDate: string | null;
  activationDate: string | null;
  cardId: string | null;
  vipNumber?: string;
  signedAgreementRecordedDate?: string;
  includePaymentReference?: boolean;
}): Milestone[] {
  const { contract, payments } = input;
  const recorded = payments.map((payment) => manilaDateOf(payment.submittedAt)).sort()[0] ?? null;
  const verified = payments.map((payment) => payment.verifiedDate).filter((date): date is string => Boolean(date)).sort()[0] ?? null;
  const stageOne = approvedCollectionMilestone(contract.priceCentavos, payments, 4_000);
  const fullPayment = approvedCollectionMilestone(contract.priceCentavos, payments, 10_000);
  const paymentReference = input.includePaymentReference ? stageOne?.payment.referenceNo : null;
  return [
    { key: "recorded", label: "Payment recorded", date: recorded },
    { key: "verified", label: "Payment verified by Finance", date: verified },
    { key: "sale", label: "Sale confirmed", date: input.saleConfirmedDate },
    { key: "release", label: "Stage 1 · 40% collected", date: stageOne?.date ?? null, note: paymentReference ? `Payment reference ${paymentReference}` : undefined },
    { key: "paid", label: "Fully paid", date: fullPayment?.date ?? null },
    { key: "activated", label: "Membership activated", date: input.activationDate },
    { key: "card", label: "VIP Number issued", date: input.signedAgreementRecordedDate ?? (input.cardId ? input.activationDate : null), note: input.vipNumber ?? input.cardId ?? undefined },
  ];
}
