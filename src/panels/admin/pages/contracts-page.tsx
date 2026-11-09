"use client";

import { ContractsTable } from "../components/contracts-table";
import { ModulePage } from "../components/module-page";

/** Admin contract review queue (05 section 11): submitted contracts are approved or returned here. */
export function ContractsPage() {
  return (
    <ModulePage
      anyOf={["vip-products"]}
      title="Contract review"
      description="Review submitted contracts, then finalize or return them. Only an authorized Admin can finalize."
      crumbs={[{ label: "VIP Products and Contracts", href: "/admin/vip-products" }, { label: "Contract review" }]}
    >
      <ContractsTable initialStatus="all" />
    </ModulePage>
  );
}
