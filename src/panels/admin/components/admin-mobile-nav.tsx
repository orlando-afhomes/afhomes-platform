"use client";

import { useState } from "react";
import { Menu as MenuIcon } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/shared/ui/sheet";
import { AdminNavList } from "./admin-nav-list";
import { useRoleAwareAdminNavigation } from "../use-role-aware-navigation";

/** Navigation sheet for screens below 768px; closes after a link is followed. */
export function AdminMobileNav() {
  const [open, setOpen] = useState(false);
  const items = useRoleAwareAdminNavigation();

  return (
    <div className="tw:md:hidden">
      <Button type="button" variant="ghost" size="icon" aria-label="Open navigation" className="tw:size-11" onClick={() => setOpen(true)}>
        <MenuIcon aria-hidden="true" />
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="tw:w-72 tw:max-w-[85vw] tw:border-sidebar-border tw:bg-sidebar tw:text-sidebar-foreground" showCloseButton>
          <SheetHeader className="tw:border-b tw:border-sidebar-border">
            <SheetTitle className="tw:text-white">Navigation</SheetTitle>
            <SheetDescription className="tw:sr-only">Administration modules you can open.</SheetDescription>
          </SheetHeader>
          <nav aria-label="Administration" className="tw:min-h-0 tw:flex-1 tw:overflow-y-auto tw:px-3 tw:pb-3">
            <AdminNavList items={items} onNavigate={() => setOpen(false)} />
          </nav>
        </SheetContent>
      </Sheet>
    </div>
  );
}
