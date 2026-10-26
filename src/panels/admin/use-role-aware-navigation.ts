"use client";

import { useMemo } from "react";
import { useDevIdentity } from "@/shared/providers/dev-identity-provider";
import { getGrantedModuleIds } from "@/modules/identity/permissions";
import { getAvailableAdminNavigation, type AdminNavItem } from "@/panels/admin/navigation";

export function useRoleAwareAdminNavigation(): AdminNavItem[] {
  const { identity } = useDevIdentity();
  return useMemo(() => {
    const granted = getGrantedModuleIds(identity);
    return getAvailableAdminNavigation().filter((item) => granted.has(item.id));
  }, [identity]);
}
