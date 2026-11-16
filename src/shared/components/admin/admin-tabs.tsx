"use client";

import { TabBar, type TabBarTab } from "@/shared/components/modern/tab-bar";

export type AdminTabItem = TabBarTab;

/** Member detail tabs share the responsive area tab controls. */
export function AdminTabs({ items, ...props }: Omit<React.ComponentProps<typeof TabBar>, "tabs"> & {
  items: readonly AdminTabItem[];
}) {
  return <TabBar tabs={items} {...props} />;
}
