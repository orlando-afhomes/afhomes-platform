"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { useOperation } from "@/data/business-queries";
import { buttonVariants } from "@/shared/ui/button";
import { ContractsTable } from "../components/contracts-table";
import { AdminPage } from "@/shared/components/admin";

/** Sales contracts list: every contract the viewer may see; opening one shows the sales detail. */
export function ContractsPage() {
  const canPrepare = useOperation("contracts.prepare");
  return (
    <AdminPage
      anyOf={["sales", "vip-products"]}
      title="Contracts"
      description="Open a contract to edit details, submit it, or submit payments."
      crumbs={[{ label: "Sales" }, { label: "Contracts" }]}
      actions={
        canPrepare ? (
          <Link href="/admin/customers/new" className={buttonVariants({ className: "tw:min-h-11 tw:sm:min-h-8" })}>
            <Plus aria-hidden="true" /> New contract
          </Link>
        ) : undefined
      }
    >
      <ContractsTable />
    </AdminPage>
  );
}
