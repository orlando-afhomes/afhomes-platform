import { describe, expect, it } from "vitest";
import { AUDIT_MODULES } from "@/modules/audit/types";
import { CREATION_ACTIONS } from "./creation-actions";
import { MODULE_PRIMARY_NAV, MODULE_PRIMARY_TAB, isAreaNavKey, modulesForNavKey, notificationDestination } from "./module-nav";
import { ADMIN_AREA_TABS, adminNavigation, type AdminNavItem, type AdminNavKey } from "@/panels/admin/navigation";

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
      expect(HIDDEN.has(key), `${auditModule} -> ${key}`).toBe(false);
      expect(item?.children?.length ?? 0, `${auditModule} -> ${key} is a leaf`).toBe(0);
    }
  });

  it("opens each module on an existing tab of its area", () => {
    for (const auditModule of AUDIT_MODULES) {
      const key = MODULE_PRIMARY_NAV[auditModule];
      expect(isAreaNavKey(key), auditModule).toBe(true);
      if (!isAreaNavKey(key)) continue;
      const values: readonly string[] = ADMIN_AREA_TABS[key].map((tab) => tab.value);
      expect(values, auditModule).toContain(MODULE_PRIMARY_TAB[auditModule]);
    }
  });
});

describe("notificationDestination", () => {
  it("points every badge-producing event to an existing tab", () => {
    for (const auditModule of AUDIT_MODULES) {
      for (const action of CREATION_ACTIONS[auditModule]) {
        const { area, tab } = notificationDestination({ module: auditModule, action });
        expect((ADMIN_AREA_TABS[area] as readonly { value: string }[]).map(({ value }) => value)).toContain(tab);
      }
    }
  });

  it("sends moved setup events to Settings and financial holds to Collections", () => {
    expect(notificationDestination({ module: "organization", action: "OUTLET_CREATED" })).toEqual({ area: "vip-products", tab: "lists" });
    expect(notificationDestination({ module: "finance", action: "RECEIPT_IMPORT_CREATED" })).toEqual({ area: "vip-products", tab: "historical-import" });
    expect(notificationDestination({ module: "sales", action: "IGP_PROJECT_CREATED" })).toEqual({ area: "vip-products", tab: "igp-projects" });
    expect(notificationDestination({ module: "stay-points", action: "REDEMPTION_HOLIDAY_ADDED" })).toEqual({ area: "vip-products", tab: "holidays" });
    expect(notificationDestination({ module: "finance", action: "FINANCIAL_HOLD_APPLIED" })).toEqual({ area: "finance", tab: "collections" });
  });

  it("separates bills, waivers and promo ledger entries in Stay Points", () => {
    expect(notificationDestination({ module: "stay-points", action: "RESORT_BILL_ENTERED" })).toEqual({ area: "stay-points", tab: "resort-bills" });
    expect(notificationDestination({ module: "stay-points", action: "COMPASSIONATE_WAIVER_REQUESTED" })).toEqual({ area: "stay-points", tab: "waivers" });
    expect(notificationDestination({ module: "stay-points", action: "PROMO_POINTS_EARNED" })).toEqual({ area: "stay-points", tab: "promo-points" });
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
    expect(modulesForNavKey("reports")).toEqual([]);
  });
});
