"use client";

import Link from "next/link";
import { useContracts } from "@/data/business-queries";
import { CANCELLATION_GROUND_LABELS } from "@/modules/contracts/types";
import { QueryState } from "@/shared/components/modern/query-state";
import { AdminPage } from "@/shared/components/admin";

export function FinanceCancellationsPage() {
  const contracts = useContracts();
  const requests = (contracts.data ?? []).filter((item) => item.cancellation?.status === "requested");

  return (
    <AdminPage anyOf={["finance"]} title="Cancellation Requests" description="Cancellations with forfeiture awaiting Finance confirmation." crumbs={[{ label: "Finance" }, { label: "Cancellation Requests" }]}>
      <QueryState isLoading={contracts.isLoading} error={contracts.error}>
        {requests.length === 0 ? <p className="tw:text-sm tw:text-muted-foreground">No cancellation is awaiting confirmation.</p> : <ul className="tw:flex tw:flex-col tw:gap-2">{requests.map((item) => <li key={item.id} className="tw:rounded-md tw:border tw:border-border tw:p-3 tw:text-sm">{item.customerName} · {item.productCode} · {item.cancellation ? CANCELLATION_GROUND_LABELS[item.cancellation.ground] : ""} · <Link className="tw:underline" href={`/admin/finance/cancellations/${item.id}`}>Open request</Link></li>)}</ul>}
      </QueryState>
    </AdminPage>
  );
}
