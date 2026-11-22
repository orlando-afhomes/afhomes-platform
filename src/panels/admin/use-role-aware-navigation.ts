"use client";

import { useMemo } from "react";
import { useAccessSnapshot } from "@/data/access-snapshot";


import {
  filterNavForAccess,
  getAdminAreaTabAccess,
  getAvailableAdminNavigation,
  type AdminAreaKey,
  type AdminAreaTabValue,
  type AdminNavItem,
} from "@/panels/admin/navigation";

export function useRoleAwareAdminNavigation(): AdminNavItem[] {
  const { modules, operations } = useAccessSnapshot();
  return useMemo(
    () => filterNavForAccess(getAvailableAdminNavigation(), modules, operations),
    [modules, operations],
  );
}

/**
 * `{ [tabValue]: allowed }` for one area page, computed exactly like the
 * sidebar (effective module grants plus operation grants). Hub pages pass
 * these as each tab's `allowed` in `AreaPage`, e.g.
 * `const access = useAdminAreaTabAccess("finance"); ... { value: "collections", allowed: access.collections, ... }`.
 */
export function useAdminAreaTabAccess<A extends AdminAreaKey>(area: A): Record<AdminAreaTabValue<A>, boolean> {
  const { modules, operations } = useAccessSnapshot();
  return useMemo(
    () => getAdminAreaTabAccess(area, modules, operations),
    [area, modules, operations],
  );
}
