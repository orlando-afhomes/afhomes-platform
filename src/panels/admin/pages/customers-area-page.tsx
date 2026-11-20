"use client";

import { Download, Upload, UsersRound } from "lucide-react";
import { AreaPage } from "@/shared/components/admin";
import { ADMIN_AREA_TABS } from "../navigation";
import { useAdminAreaTabAccess } from "../use-role-aware-navigation";
import { CustomerExportPanel, CustomerImportPanel } from "./customer-import-export-page";
import { CustomersActions, CustomersTab } from "./customers-page";

const TAB_ICONS = { customers: UsersRound, import: Upload, export: Download };

const PANELS = {
  customers: () => <CustomersTab />,
  import: () => <CustomerImportPanel />,
  export: () => <CustomerExportPanel />,
};

export function CustomersAreaPage() {
  const access = useAdminAreaTabAccess("customers");
  const tabs = ADMIN_AREA_TABS.customers.map(({ value, label }) => ({
    value, label, allowed: access[value], render: PANELS[value], icon: TAB_ICONS[value],
  }));
  return <AreaPage anyOf={["customers"]} title="Customers" tabs={tabs} actions={(active) => active === "customers" ? <CustomersActions /> : null} />;
}
