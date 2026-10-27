"use client";

import { useMemo } from "react";
import { useDevIdentity } from "@/shared/providers/dev-identity-provider";
import { useMockStore } from "@/shared/providers/mock-store-provider";
import { resolveEffectiveModules } from "@/data/mock/authorization";
import { getAvailableAdminNavigation, type AdminNavItem } from "@/panels/admin/navigation";

export function useRoleAwareAdminNavigation(): AdminNavItem[] {
  const { identity } = useDevIdentity();
  const store = useMockStore();
  return useMemo(() => {
    const granted = resolveEffectiveModules(store, identity);
    const filter = (items: AdminNavItem[]): AdminNavItem[] => {
      const result: AdminNavItem[] = [];
      for (const item of items) {
        const children = item.children ? filter(item.children) : undefined;
        if (granted.has(item.id) || (children && children.length > 0)) {
          result.push({ ...item, children });
        }
      }
      return result;
    };
    return filter(getAvailableAdminNavigation());
  }, [identity, store]);
}
