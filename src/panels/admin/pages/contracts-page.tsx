"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import { useOperation } from "@/data/business-queries";
import { buttonVariants } from "@/shared/ui/button";
import { ContractsTable } from "../components/contracts-table";

/** Contracts tab of the Sales area: every contract the viewer may see and review. */
export function ContractsTab() {
  const status = useSearchParams()?.get("status") ?? "all";
  return <ContractsTable key={status} initialStatus={status} />;
}

/** Contracts tab header action: New contract, for `contracts.prepare` only. */
export function ContractsActions() {
  const canPrepare = useOperation("contracts.prepare");
  return canPrepare ? (
    <Link href="/admin/customers?tab=customers" className={buttonVariants({ className: "tw:min-h-11 tw:sm:min-h-8" })}>
      <Plus aria-hidden="true" /> New contract
    </Link>
  ) : null;
}
