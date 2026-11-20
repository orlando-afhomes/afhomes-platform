"use client";

import { useState } from "react";
import { Menu as MenuIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/ui/avatar";
import { Button } from "@/shared/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/shared/ui/sheet";
import { AdminBrand } from "./admin-brand";
import { AdminNavList } from "./admin-nav-list";
import { LogoutButton } from "./admin-logout-button";
import { useLogout } from "../use-logout";
import { useAdminUser } from "../use-admin-user";
import { useRoleAwareAdminNavigation } from "../use-role-aware-navigation";

/** Navigation sheet for screens below 768px; opens from the right (thumb side) and closes after a link is followed. */
export function AdminMobileNav() {
  const [open, setOpen] = useState(false);
  const items = useRoleAwareAdminNavigation();
  const { logout, dialog } = useLogout();
  const user = useAdminUser();

  const confirmLogout = () => {
    setOpen(false);
    logout();
  };

  return (
    <div className="tw:md:hidden">
      <Button type="button" variant="ghost" size="icon" aria-label="Open navigation" className="tw:size-11" onClick={() => setOpen(true)}>
        <MenuIcon aria-hidden="true" />
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="tw:w-72 tw:max-w-[85vw] tw:border-sidebar-border tw:bg-sidebar tw:bg-[linear-gradient(180deg,color-mix(in_oklab,var(--color-brand-secondary)_30%,var(--color-brand-deep))_0%,var(--color-brand-deep)_42%)] tw:text-sidebar-foreground" showCloseButton>
          <SheetHeader className="tw:flex-row tw:items-center tw:border-b tw:border-sidebar-border tw:py-3 tw:pr-14">
            <AdminBrand />
            <SheetTitle className="tw:sr-only">Navigation</SheetTitle>
            <SheetDescription className="tw:sr-only">Administration modules you can open.</SheetDescription>
          </SheetHeader>
          <nav aria-label="Administration" className="tw:min-h-0 tw:flex-1 tw:overflow-y-auto tw:px-3 tw:pb-3">
            <AdminNavList items={items} onNavigate={() => setOpen(false)} />
          </nav>
          <div className="tw:shrink-0 tw:border-t tw:border-sidebar-border tw:p-3">
            <div className="tw:flex tw:items-center tw:gap-2.5 tw:rounded-xl tw:bg-white/[0.06] tw:p-2">
              <Avatar className="tw:size-9 tw:bg-white/15 tw:text-xs tw:text-white tw:ring-2 tw:ring-white/20">
                {user.avatarUrl ? <AvatarImage src={user.avatarUrl} alt="" /> : null}
                <AvatarFallback className="tw:bg-white/15 tw:text-white">{user.initials}</AvatarFallback>
              </Avatar>
              <span className="tw:flex tw:min-w-0 tw:flex-1 tw:flex-col tw:leading-tight">
                <span className="tw:truncate tw:text-[13px] tw:font-semibold tw:text-white">{user.name}</span>
                <span className="tw:truncate tw:text-[11px] tw:text-white/65">{user.roleLabel}</span>
              </span>
              <LogoutButton onClick={confirmLogout} />
            </div>
          </div>
        </SheetContent>
      </Sheet>
      {dialog}
    </div>
  );
}
