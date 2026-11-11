"use client";

import Link from "next/link";
import { useMemberships } from "@/data/business-queries";
import { QueryState } from "@/shared/components/modern/query-state";
import { AdminPage, AdminSectionHeading } from "@/shared/components/admin";
import { useContractHref } from "../components/use-contract-href";

export function FinanceHoldsPage() {
  const memberships = useMemberships();
  const contractHref = useContractHref();
  const holds = (memberships.data ?? []).filter((item) => item.financialHold);

  return (
    <AdminPage anyOf={["finance"]} title="Financial Holds" description="Memberships currently on Financial Hold." crumbs={[{ label: "Finance" }, { label: "Financial Holds" }]}>
      <AdminSectionHeading title="Financial holds" description="A membership is held automatically when a verified payment reversal leaves a balance. It is released when Finance verifies settlement." />
      <QueryState isLoading={memberships.isLoading} error={memberships.error}>
        {holds.length === 0 ? <p className="tw:text-sm tw:text-muted-foreground">No memberships are on Financial Hold.</p> : <ul className="tw:flex tw:flex-col tw:gap-2">{holds.map((item) => <li key={item.id} className="tw:rounded-md tw:border tw:border-border tw:p-3 tw:text-sm">{item.customerName} · {item.productName} · <Link className="tw:underline" href={contractHref(item.contractId)}>Open contract</Link></li>)}</ul>}
      </QueryState>
    </AdminPage>
  );
}
