"use client";

import { AreaPage } from "@/shared/components/admin";
import { ADMIN_AREA_TABS, type AdminAreaTabValue } from "../navigation";
import { useAdminAreaTabAccess } from "../use-role-aware-navigation";
import { SalesNetworkMembersPage } from "./sales-network-members-page";
import { SalesNetworkGenealogyPage } from "./sales-network-genealogy-page";
import { RegistrationApplicationsPage } from "./registration-applications-page";

const panels = {
  members: SalesNetworkMembersPage,
  genealogy: SalesNetworkGenealogyPage,
  registrations: RegistrationApplicationsPage,
} satisfies Record<AdminAreaTabValue<"sales-network">, unknown>;

export function SalesNetworkAreaPage() {
  const access = useAdminAreaTabAccess("sales-network");
  const tabs = ADMIN_AREA_TABS["sales-network"].map(({ value, label }) => {
    const Panel = panels[value];
    return { value, label, allowed: access[value], render: () => <Panel embedded /> };
  });

  return <AreaPage anyOf={["sales-network", "sales-network-members", "sales-network-genealogy", "accreditation-registrations"]} title="Sales Network" tabs={tabs} />;
}
