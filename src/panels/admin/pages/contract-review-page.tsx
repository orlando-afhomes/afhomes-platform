"use client";

import { ContractsTable } from "../components/contracts-table";
import { AdminPage } from "@/shared/components/admin";
import { useContractReviewHref } from "../components/use-contract-href";

/** Admin contract review queue (05 section 11): submitted contracts are approved or returned here. */
export function ContractReviewPage() {
  const reviewHref = useContractReviewHref();
  return (
    <AdminPage
      anyOf={["vip-products"]}
      title="Contract Review"
      description="Review submitted contracts, then finalize or return them. Only an authorized Admin can finalize."
      crumbs={[{ label: "Sales" }, { label: "Contract Review" }]}
    >
      <ContractsTable initialStatus="submitted" contractHref={reviewHref} />
    </AdminPage>
  );
}
