"use client";

import { ContractsTable } from "../components/contracts-table";
import { useContractReviewHref } from "../components/use-contract-href";

/** Contract review tab of the Sales area (05 section 11): submitted contracts are approved or returned here. */
export function ContractReviewTab() {
  const reviewHref = useContractReviewHref();
  return <ContractsTable initialStatus="submitted" contractHref={reviewHref} />;
}
