"use client";

import { Gift } from "lucide-react";
import { usePromoBalances } from "@/data/promo-queries";
import { AdminSectionHeading, AdminStatCard, AdminStatGrid } from "@/shared/components/admin";

/** Promo Points of one membership. A separate wallet: it never changes the Grant Stay Points above it. */
export function PromoPointsBalanceCard({ membershipId }: { membershipId: string }) {
  const balances = usePromoBalances();
  const mine = balances.data?.find((item) => item.membershipId === membershipId);
  const fmt = (value: number | undefined) => (value ?? 0).toLocaleString("en-PH");
  return (
    <>
      <AdminSectionHeading title="Promo Points" />
      <AdminStatGrid columns={3}>
        <AdminStatCard loading={balances.isLoading} error={balances.error} label="Promo Points available" value={fmt(mine?.total.available)} icon={Gift} tone="success" />
        <AdminStatCard loading={balances.isLoading} error={balances.error} label="Promo Points earned" value={fmt(mine?.total.earned)} icon={Gift} />
        <AdminStatCard loading={balances.isLoading} error={balances.error} label="Promo Points used" value={fmt(mine ? mine.total.used - mine.total.voided : 0)} icon={Gift} />
      </AdminStatGrid>
    </>
  );
}
