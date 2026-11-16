"use client";

import { useState, type ReactNode } from "react";
import { AreaPage } from "@/shared/components/admin";
import { Button } from "@/shared/ui/button";
import { Plus } from "lucide-react";
import { ADMIN_AREA_TABS, type AdminAreaTabValue } from "../navigation";
import { useAdminAreaTabAccess } from "../use-role-aware-navigation";
import { StaffPage } from "./staff-page";
import { DepartmentsPage } from "./departments-page";
import { RolesPage } from "./roles-page";

export function OrganizationAreaPage() {
  const access = useAdminAreaTabAccess("organization");
  const [addingStaff, setAddingStaff] = useState(false);
  const [creatingDepartment, setCreatingDepartment] = useState(false);
  const [creatingRole, setCreatingRole] = useState(false);
  const panels: Record<AdminAreaTabValue<"organization">, () => ReactNode> = {
    staff: () => <StaffPage embedded adding={addingStaff} onAddingChange={setAddingStaff} />,
    departments: () => <DepartmentsPage embedded creating={creatingDepartment} onCreatingChange={setCreatingDepartment} />,
    roles: () => <RolesPage embedded creating={creatingRole} onCreatingChange={setCreatingRole} />,
  };
  const tabs = ADMIN_AREA_TABS["organization"].map(({ value, label }) => ({ value, label, allowed: access[value], render: panels[value] }));

  return (
    <AreaPage
      anyOf={["staff", "departments", "roles"]}
      title="Organization"
      tabs={tabs}
      actions={(active) => {
        if (active === "staff") return <AddButton onClick={() => setAddingStaff(true)}>Add staff</AddButton>;
        if (active === "departments") return <AddButton onClick={() => setCreatingDepartment(true)}>Create department</AddButton>;
        if (active === "roles") return <AddButton onClick={() => setCreatingRole(true)}>Create role</AddButton>;
        return null;
      }}
    />
  );
}

function AddButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <Button type="button" onClick={onClick}>
      <Plus aria-hidden="true" /> {children}
    </Button>
  );
}
