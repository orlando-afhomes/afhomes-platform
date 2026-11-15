"use client";

import { useMemo } from "react";
import { useDevIdentity } from "@/shared/providers/dev-identity-provider";
import { useMockStore } from "@/shared/providers/mock-store-provider";
import { resolveEffectiveModules } from "@/data/mock/authorization";
import { getGrantedOperations } from "@/modules/identity/permissions";
import {
  filterNavForAccess,
  getAdminAreaTabAccess,
  getAvailableAdminNavigation,
  type AdminAreaKey,
  type AdminAreaTabValue,
  type AdminNavItem,
} from "@/panels/admin/navigation";

export function useRoleAwareAdminNavigation(): AdminNavItem[] {
  const { identity } = useDevIdentity();
  const store = useMockStore();
  return useMemo(
    () => filterNavForAccess(getAvailableAdminNavigation(), resolveEffectiveModules(store, identity), getGrantedOperations(identity)),
    [identity, store],
  );
}

/**
 * `{ [tabValue]: allowed }` for one area page, computed exactly like the
 * sidebar (effective module grants plus operation grants). Hub pages pass
 * these as each tab's `allowed` in `AreaPage`, e.g.
 * `const access = useAdminAreaTabAccess("finance"); ... { value: "collections", allowed: access.collections, ... }`.
 */
export function useAdminAreaTabAccess<A extends AdminAreaKey>(area: A): Record<AdminAreaTabValue<A>, boolean> {
  const { identity } = useDevIdentity();
  const store = useMockStore();
  return useMemo(
    () => getAdminAreaTabAccess(area, resolveEffectiveModules(store, identity), getGrantedOperations(identity)),
    [area, identity, store],
  );
}
