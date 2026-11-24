"use client";

import { cn } from "@/shared/lib/utils";
import { AdminBrand } from "./admin-brand";
import { AdminNavList } from "./admin-nav-list";
import { LogoutButton } from "./admin-logout-button";
import { useRoleAwareAdminNavigation } from "../use-role-aware-navigation";
import { useLogout } from "../use-logout";
import { useAdminUser } from "../use-admin-user";

/** Fixed desktop rail (hidden below 768px, where the header opens the mobile sheet). */
export function AdminSidebar({ collapsed }: { collapsed: boolean; onCollapse?: (value: boolean) => void }) {
  const items = useRoleAwareAdminNavigation();
  const { logout, dialog } = useLogout();
  const user = useAdminUser();

  return (
    <aside
      data-collapsed={collapsed}
      className={cn(
        "tw:fixed tw:inset-y-0 tw:left-0 tw:z-10 tw:hidden tw:flex-col tw:overflow-hidden tw:bg-sidebar tw:bg-[linear-gradient(180deg,color-mix(in_oklab,var(--color-brand-secondary)_30%,var(--color-brand-deep))_0%,var(--color-brand-deep)_42%)] tw:text-sidebar-foreground tw:shadow-[inset_-1px_0_0_rgba(255,255,255,0.06)] tw:transition-[width] tw:duration-200 tw:motion-reduce:transition-none tw:md:flex",
        collapsed ? "tw:w-20" : "tw:w-60",
      )}
    >
      <div className={cn("tw:flex tw:h-16 tw:shrink-0 tw:items-center tw:border-b tw:border-sidebar-border tw:px-4 tw:whitespace-nowrap", collapsed && "tw:justify-center tw:px-0")}>
        <AdminBrand iconOnly={collapsed} />
      </div>
      <nav aria-label="Administration" className="tw:min-h-0 tw:flex-1 tw:overflow-y-auto tw:p-3">
        <AdminNavList items={items} collapsed={collapsed} />
      </nav>
      <div className={cn("tw:shrink-0 tw:border-t tw:border-sidebar-border tw:p-3", collapsed && "tw:flex tw:justify-center")}>
        <LogoutButton user={user} collapsed={collapsed} onClick={logout} />
      </div>
      {dialog}
    </aside>
  );
}
