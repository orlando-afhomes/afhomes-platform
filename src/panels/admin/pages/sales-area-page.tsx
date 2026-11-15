"use client";

import { AreaPage } from "@/shared/components/admin";
import { ADMIN_AREA_TABS } from "../navigation";
import { useAdminAreaTabAccess } from "../use-role-aware-navigation";
import { ContractReviewTab } from "./contract-review-page";
import { ContractsActions, ContractsTab } from "./contracts-page";
import { IgpTab } from "./igp-page";
import { SalesTab } from "./sales-page";

const PANELS = {
  sales: () => <SalesTab />,
  contracts: () => <ContractsTab />,
  "contract-review": () => <ContractReviewTab />,
  igp: () => <IgpTab />,
};

export function SalesAreaPage() {
  const access = useAdminAreaTabAccess("sales");
  const tabs = ADMIN_AREA_TABS.sales.map(({ value, label }) => ({ value, label, allowed: access[value], render: PANELS[value] }));
  return <AreaPage anyOf={["sales", "vip-products", "finance"]} title="Sales" tabs={tabs} actions={(active) => active === "contracts" ? <ContractsActions /> : null} />;
}
