import "server-only";
import { paymentCountedDate, periodCollections } from "@/modules/finance/rules";
import { manilaDateOf } from "@/shared/lib/dates";
import type { Actor } from "@/server/auth/actor";
import { requireOperation } from "@/server/auth/authorize";
import { loadVerifiedPayments } from "@/server/repositories/records";

/**
 * Collections for a period from Finance-verified receipts only, counted by their accounting date (doc 07, 11).
 * Reversals and refunds reduce the period they are dated in. Each receipt counts once.
 */
export async function collectionsReport(actor: Actor, range: { from: string; to: string }) {
  requireOperation(actor, "finance.reports.view");
  const payments = await loadVerifiedPayments();
  const { gross, adjusted, net } = periodCollections(payments, range.from, range.to);
  const receiptCount = payments.filter((payment) => {
    const counted = paymentCountedDate(payment);
    return counted !== null && manilaDateOf(counted) >= range.from && manilaDateOf(counted) <= range.to;
  }).length;
  return { from: range.from, to: range.to, grossCentavos: gross, adjustedCentavos: adjusted, netCentavos: net, receiptCount };
}
