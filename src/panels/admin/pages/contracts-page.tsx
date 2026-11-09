"use client";

import { ContractsTable } from "../components/contracts-table";
import { ModulePage } from "../components/module-page";

/** Sales contracts list: every contract the viewer may see; opening one shows the sales detail. */
export function ContractsPage() {
  return (
    <ModulePage
      anyOf={["sales", "vip-products"]}
      title="Contracts"
      description="Open a contract to edit details, submit it, or submit payments."
      crumbs={[{ label: "Sales" }, { label: "Contracts" }]}
    >
      <ContractsTable />
    </ModulePage>
  );
}
