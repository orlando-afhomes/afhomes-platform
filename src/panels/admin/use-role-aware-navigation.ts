"use client";

import { useMemo } from "react";
import { useDevIdentity } from "@/shared/providers/dev-identity-provider";
import { useMockStore } from "@/shared/providers/mock-store-provider";
import { resolveEffectiveModules } from "@/data/mock/authorization";
import { getGrantedOperations } from "@/modules/identity/permissions";
import { filterNavForAccess, getAvailableAdminNavigation, type AdminNavItem } from "@/panels/admin/navigation";

export function useRoleAwareAdminNavigation(): AdminNavItem[] {
  const { identity } = useDevIdentity();
  const store = useMockStore();
  return useMemo(
    () => filterNavForAccess(getAvailableAdminNavigation(), resolveEffectiveModules(store, identity), getGrantedOperations(identity)),
    [identity, store],
  );
}
