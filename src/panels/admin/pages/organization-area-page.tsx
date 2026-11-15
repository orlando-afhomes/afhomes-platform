"use client";

import { AreaPage } from "@/shared/components/admin";
import { ADMIN_AREA_TABS, type AdminAreaTabValue } from "../navigation";
import { useAdminAreaTabAccess } from "../use-role-aware-navigation";
import { StaffPage } from "./staff-page";
import { DepartmentsPage } from "./departments-page";
import { RolesPage } from "./roles-page";
import { ListsPage } from "./lists-page";

const panels = {
  staff: StaffPage,
  departments: DepartmentsPage,
  roles: RolesPage,
  lists: ListsPage,
} satisfies Record<AdminAreaTabValue<"organization">, unknown>;

export function OrganizationAreaPage() {
  const access = useAdminAreaTabAccess("organization");
  const tabs = ADMIN_AREA_TABS["organization"].map(({ value, label }) => {
    const Panel = panels[value];
    return { value, label, allowed: access[value], render: () => <Panel embedded /> };
  });

  return <AreaPage anyOf={["staff", "departments", "roles"]} title="Organization" tabs={tabs} />;
}
