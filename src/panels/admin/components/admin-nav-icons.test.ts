import { expect, it } from "vitest";
import { ADMIN_NAV_ICONS } from "./admin-nav-icons";
import { NAV_GROUPS } from "./admin-nav-list";

it("gives every sidebar item and group its own icon", () => {
  const icons = [...Object.values(ADMIN_NAV_ICONS), ...NAV_GROUPS.map((group) => group.icon)];
  expect(new Set(icons).size).toBe(icons.length);
});
