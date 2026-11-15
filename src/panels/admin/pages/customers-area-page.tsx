"use client";

import { AreaPage } from "@/shared/components/admin";
import { ADMIN_AREA_TABS } from "../navigation";
import { useAdminAreaTabAccess } from "../use-role-aware-navigation";
import { CustomerImportExportTab } from "./customer-import-export-page";
import { CustomersActions, CustomersTab } from "./customers-page";

const PANELS = {
  customers: () => <CustomersTab />,
  "import-export": () => <CustomerImportExportTab />,
};

export function CustomersAreaPage() {
  const access = useAdminAreaTabAccess("customers");
  const tabs = ADMIN_AREA_TABS.customers.map(({ value, label }) => ({ value, label, allowed: access[value], render: PANELS[value] }));
  return <AreaPage anyOf={["customers"]} title="Customers" tabs={tabs} actions={(active) => active === "customers" ? <CustomersActions /> : null} />;
}
