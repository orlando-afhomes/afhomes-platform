"use client";

import { LogOut } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/ui/avatar";
import { Button } from "@/shared/ui/button";
import { AdminBrand } from "./admin-brand";
import { AdminNavList } from "./admin-nav-list";
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
      <div className={cn("tw:shrink-0 tw:border-t tw:border-sidebar-border tw:p-3", collapsed && "tw:flex tw:flex-col tw:items-center tw:gap-2")}>
        <div className={cn("tw:flex tw:items-center tw:gap-2.5 tw:rounded-xl tw:bg-white/[0.06] tw:p-2", collapsed && "tw:bg-transparent tw:p-0")}>
          <Avatar className="tw:size-9 tw:bg-white/15 tw:text-xs tw:text-white tw:ring-2 tw:ring-white/20">
            {user.avatarUrl ? <AvatarImage src={user.avatarUrl} alt="" /> : null}
            <AvatarFallback className="tw:bg-white/15 tw:text-white">{user.initials}</AvatarFallback>
          </Avatar>
          {collapsed ? null : (
            <span className="tw:flex tw:min-w-0 tw:flex-1 tw:flex-col tw:leading-tight">
              <span className="tw:truncate tw:text-[13px] tw:font-semibold tw:text-white">{user.name}</span>
              <span className="tw:truncate tw:text-[11px] tw:text-white/65">{user.roleLabel}</span>
            </span>
          )}
          {collapsed ? null : <LogoutButton onClick={logout} />}
        </div>
        {collapsed ? <LogoutButton onClick={logout} /> : null}
      </div>
      {dialog}
    </aside>
  );
}

function LogoutButton({ onClick }: { onClick: () => void }) {
  return (
    <Button type="button" variant="ghost" size="icon" onClick={onClick} aria-label="Log out" title="Log out" className="tw:size-9 tw:shrink-0 tw:text-white/70 tw:hover:bg-white/10 tw:hover:text-white">
      <LogOut aria-hidden="true" />
    </Button>
  );
}
