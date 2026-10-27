"use client";

import { useState } from "react";
import { Button, Drawer } from "antd";
import { Menu as MenuIcon } from "lucide-react";
import { AdminNavList } from "./admin-nav-list";
import { useRoleAwareAdminNavigation } from "../use-role-aware-navigation";

export function AdminMobileNav() {
  const [open, setOpen] = useState(false);
  const items = useRoleAwareAdminNavigation();

  return (
    <div className="admin-mobile-nav">
      <Button
        type="text"
        icon={<MenuIcon className="size-4" />}
        aria-label="Open navigation"
        className="admin-mobile-nav__trigger"
        onClick={() => setOpen(true)}
      />
      <Drawer
        title="Navigation"
        placement="left"
        size={272}
        open={open}
        onClose={() => setOpen(false)}
        destroyOnHidden
        className="admin-mobile-nav__drawer"
        classNames={{
          header: "admin-mobile-nav__drawer-header",
          body: "admin-mobile-nav__drawer-body",
        }}
      >
        <nav aria-label="Administration" className="admin-mobile-nav__navigation">
          <AdminNavList items={items} onNavigate={() => setOpen(false)} />
        </nav>
      </Drawer>
    </div>
  );
}
