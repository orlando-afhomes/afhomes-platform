"use client";

import { AdminNavList } from "./admin-nav-list";
import { useRoleAwareAdminNavigation } from "../use-role-aware-navigation";

export function AdminSidebar() {
  const items = useRoleAwareAdminNavigation();

  return (
    <aside className="hidden w-60 shrink-0 border-r border-border bg-sidebar md:block">
      <div className="px-4 py-4 text-sm font-semibold">AFhomes Admin</div>
      <div className="px-2">
        <AdminNavList items={items} />
      </div>
    </aside>
  );
}
