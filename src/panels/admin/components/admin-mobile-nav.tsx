"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogTrigger,
  DialogPopup,
  DialogTitle,
} from "@/components/ui/dialog";
import { AdminNavList } from "./admin-nav-list";
import { useRoleAwareAdminNavigation } from "../use-role-aware-navigation";

export function AdminMobileNav() {
  const [open, setOpen] = useState(false);
  const items = useRoleAwareAdminNavigation();

  return (
    <div className="md:hidden">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger render={<Button variant="outline" size="icon" aria-label="Open navigation" />}>
          <Menu className="size-4" />
        </DialogTrigger>
        <DialogPopup className="!left-0 !top-0 !h-full !w-72 !max-w-[80vw] !translate-x-0 !translate-y-0 !rounded-none border-r">
          <DialogTitle className="mb-4">Navigation</DialogTitle>
          <AdminNavList items={items} onNavigate={() => setOpen(false)} />
        </DialogPopup>
      </Dialog>
    </div>
  );
}
