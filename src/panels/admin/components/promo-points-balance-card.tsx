"use client";

import { usePromoBalances } from "@/data/promo-queries";
import type { DetailSection } from "@/shared/components/modern/record-details-sheet";

/** Promo Points of one membership as a details-sheet section (available, earned, used). */
export function usePromoPointsBalanceSection(membershipId: string | undefined): DetailSection {
  const balances = usePromoBalances();
  const mine = balances.data?.find((item) => item.membershipId === membershipId);
  const show = (value: number) => (balances.isLoading ? "Loading" : balances.error ? "Could not load" : value.toLocaleString("en-PH"));
  return {
    title: "Promo Points",
    rows: [
      { label: "Available", value: show(mine?.total.available ?? 0) },
      { label: "Earned", value: show(mine?.total.earned ?? 0) },
      { label: "Used", value: show(mine ? mine.total.used - mine.total.voided : 0) },
    ],
  };
}
