"use client";

import { AreaPage } from "@/shared/components/admin";
import { ADMIN_AREA_TABS } from "../navigation";
import { useAdminAreaTabAccess } from "../use-role-aware-navigation";
import { CustomerImportExportTab } from "./customer-import-export-page";
import { CustomerLookupPanel } from "./customer-lookup-panel";
import { CustomersActions, CustomersTab } from "./customers-page";

const PANELS = {
  customers: () => <CustomersTab />,
  "import-export": () => <CustomerImportExportTab />,
  lookup: () => <CustomerLookupPanel />,
};

export function CustomersAreaPage() {
  const access = useAdminAreaTabAccess("customers");
  const tabs = ADMIN_AREA_TABS.customers.map(({ value, label }) => ({ value, label, allowed: access[value], render: PANELS[value] }));
  return <AreaPage anyOf={["customers", "membership"]} title="Customers" tabs={tabs} actions={(active) => active === "customers" ? <CustomersActions /> : null} />;
}
