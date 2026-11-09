"use client";

import Image from "next/image";
import { LogOut } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { AdminNavList } from "./admin-nav-list";
import { useRoleAwareAdminNavigation } from "../use-role-aware-navigation";
import { useLogout } from "../use-logout";

/** Fixed desktop rail (hidden below 768px, where the header opens the mobile sheet). */
export function AdminSidebar({ collapsed }: { collapsed: boolean; onCollapse?: (value: boolean) => void }) {
  const items = useRoleAwareAdminNavigation();
  const { logout, dialog } = useLogout();

  return (
    <aside
      data-collapsed={collapsed}
      className={cn(
        "tw:fixed tw:inset-y-0 tw:left-0 tw:z-10 tw:hidden tw:flex-col tw:overflow-hidden tw:bg-sidebar tw:text-sidebar-foreground tw:transition-[width] tw:duration-200 tw:motion-reduce:transition-none tw:md:flex",
        collapsed ? "tw:w-20" : "tw:w-60",
      )}
    >
      <div
        className={cn(
          "tw:flex tw:h-16 tw:shrink-0 tw:items-center tw:gap-3 tw:border-b tw:border-sidebar-border tw:px-4 tw:whitespace-nowrap",
          collapsed && "tw:justify-center tw:px-0",
        )}
      >
        <span aria-hidden="true" className="tw:inline-flex tw:size-9 tw:shrink-0 tw:items-center tw:justify-center tw:overflow-hidden">
          <Image src="/images/logo.png" alt="" width={30} height={34} priority className="tw:h-full tw:w-auto tw:max-w-full tw:object-contain" />
        </span>
        {collapsed ? null : (
          <span className="tw:flex tw:min-w-0 tw:flex-col tw:gap-px">
            <span className="tw:text-[15px] tw:leading-tight tw:font-bold tw:text-white">AFHomes</span>
            <span className="tw:text-[11px] tw:leading-tight tw:text-white/65">Management Platform</span>
          </span>
        )}
      </div>
      <nav aria-label="Administration" className="tw:min-h-0 tw:flex-1 tw:overflow-y-auto tw:p-3">
        <AdminNavList items={items} collapsed={collapsed} />
      </nav>
      <div className={cn("tw:shrink-0 tw:border-t tw:border-sidebar-border tw:p-3", collapsed && "tw:flex tw:justify-center")}>
        <Button
          type="button"
          variant="outline"
          onClick={logout}
          aria-label="Log out"
          className={cn(
            "tw:min-h-11 tw:border-white/20 tw:bg-transparent tw:text-white tw:hover:bg-white/10 tw:hover:text-white",
            collapsed ? "tw:size-11 tw:p-0" : "tw:w-full",
          )}
        >
          <LogOut aria-hidden="true" />
          {collapsed ? null : "Log out"}
        </Button>
      </div>
      {dialog}
    </aside>
  );
}
