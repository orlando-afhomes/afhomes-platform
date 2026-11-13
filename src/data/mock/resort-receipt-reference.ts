import type { MockStore } from "./seed";

const normalizeReferenceForMatch = (reference?: string | null) => (reference ?? "").trim().toLowerCase();

export function hasResortReceiptReference(store: MockStore, reference: string | null | undefined): boolean {
  const key = normalizeReferenceForMatch(reference);
  return Boolean(key && store.resortSpends.some((bill) => normalizeReferenceForMatch(bill.verificationRef) === key));
}

export function hasRedemptionReceiptReference(store: MockStore, reference: string): boolean {
  const key = normalizeReferenceForMatch(reference);
  return Boolean(key && store.redemption.bookings.some((booking) => normalizeReferenceForMatch(booking.cashReference) === key));
}

export function hasImportedReceiptReference(store: MockStore, reference: string | null | undefined): boolean {
  const key = normalizeReferenceForMatch(reference);
  return Boolean(key && store.receiptImportBatches.some((batch) =>
    batch.status !== "rejected" && batch.receipts.some((receipt) => normalizeReferenceForMatch(receipt.referenceNo) === key)));
}
