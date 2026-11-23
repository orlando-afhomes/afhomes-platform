"use client";

import { useState, type ReactNode } from "react";
import { Handshake, UserPlus } from "lucide-react";
import { hasOperationPermission } from "@/modules/identity/permissions";
import { AreaPage } from "@/shared/components/admin";
import { useDevIdentity } from "@/shared/providers/dev-identity-provider";
import { Button } from "@/shared/ui/button";
import { ADMIN_AREA_TABS, type AdminAreaTabValue } from "../navigation";
import { useAdminAreaTabAccess } from "../use-role-aware-navigation";
import { SalesNetworkMembersPage } from "./sales-network-members-page";
import { SalesNetworkGenealogyPage } from "./sales-network-genealogy-page";
import { RegistrationApplicationsPage } from "./registration-applications-page";

export function SalesNetworkAreaPage() {
  const access = useAdminAreaTabAccess("sales-network");
  const { identity } = useDevIdentity();
  const canManage = hasOperationPermission(identity, "sales-network.manage");
  const [accreditedMode, setAccreditedMode] = useState<"IST" | "OST" | null>(null);
  const panels: Record<AdminAreaTabValue<"sales-network">, () => ReactNode> = {
    members: () => <SalesNetworkMembersPage embedded accreditedMode={accreditedMode} onAccreditedModeChange={setAccreditedMode} />,
    genealogy: () => <SalesNetworkGenealogyPage embedded />,
    registrations: () => <RegistrationApplicationsPage embedded />,
  };
  const tabs = ADMIN_AREA_TABS["sales-network"].map(({ value, label }) => ({ value, label, allowed: access[value], render: panels[value] }));

  return (
    <AreaPage
      anyOf={["sales-network", "sales-network-members", "sales-network-genealogy", "accreditation-registrations"]}
      title="Sales Network"
      tabs={tabs}
      actions={(active) =>
        active === "members" && canManage ? (
          <>
            <Button type="button" onClick={() => setAccreditedMode("IST")}>
              <UserPlus aria-hidden="true" /> Add IST
            </Button>
            <Button type="button" variant="info" onClick={() => setAccreditedMode("OST")}>
              <Handshake aria-hidden="true" /> Add OST
            </Button>
          </>
        ) : null
      }
    />
  );
}
