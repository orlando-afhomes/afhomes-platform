import { describe, expect, it } from "vitest";
import { AUDIT_MODULES } from "@/modules/audit/types";
import { MODULE_PRIMARY_NAV, modulesForNavKey } from "./module-nav";
import { adminNavigation, type AdminNavItem, type AdminNavKey } from "@/panels/admin/navigation";

function collectItems(items: AdminNavItem[], into = new Map<AdminNavKey, AdminNavItem>()): Map<AdminNavKey, AdminNavItem> {
  for (const item of items) {
    into.set(item.id, item);
    if (item.children) collectItems(item.children, into);
  }
  return into;
}

const ALL_ITEMS = collectItems(adminNavigation);
const HIDDEN = new Set([...ALL_ITEMS.values()].filter((item) => item.hideFromNav).map((item) => item.id));

describe("MODULE_PRIMARY_NAV", () => {
  it("maps every audit module to exactly one nav key", () => {
    expect(Object.keys(MODULE_PRIMARY_NAV).sort()).toEqual([...AUDIT_MODULES].sort());
  });

  it("points only at rendered leaf items, never at hideFromNav entries", () => {
    for (const auditModule of AUDIT_MODULES) {
      const key = MODULE_PRIMARY_NAV[auditModule];
      const item = ALL_ITEMS.get(key);
      expect(item, auditModule).toBeDefined();
      expect(HIDDEN.has(key), `${module} -> ${key}`).toBe(false);
      expect(item?.children?.length ?? 0, `${module} -> ${key} is a leaf`).toBe(0);
    }
  });
});

describe("modulesForNavKey", () => {
  it("reverse-maps each primary key to its module", () => {
    for (const auditModule of AUDIT_MODULES) {
      expect(modulesForNavKey(MODULE_PRIMARY_NAV[auditModule])).toContain(auditModule);
    }
  });

  it("returns an empty list for keys no module claims", () => {
    expect(modulesForNavKey("dashboard")).toEqual([]);
    expect(modulesForNavKey("reports-group")).toEqual([]);
  });
});
