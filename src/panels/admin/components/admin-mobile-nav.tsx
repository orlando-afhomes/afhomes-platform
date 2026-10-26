"use client";

import { useState } from "react";
import { Button, Drawer } from "antd";
import { Menu as MenuIcon } from "lucide-react";
import { AdminNavList } from "./admin-nav-list";
import { useRoleAwareAdminNavigation } from "../use-role-aware-navigation";
import styles from "./admin-mobile-nav.module.css";

export function AdminMobileNav() {
  const [open, setOpen] = useState(false);
  const items = useRoleAwareAdminNavigation();

  return (
    <div className={styles.triggerWrap}>
      <Button
        type="text"
        icon={<MenuIcon className="size-4" />}
        aria-label="Open navigation"
        onClick={() => setOpen(true)}
      />
      <Drawer
        title="Navigation"
        placement="left"
        size={272}
        open={open}
        onClose={() => setOpen(false)}
        destroyOnHidden
        styles={{ body: { background: "#0e2b20", padding: 8 } }}
      >
        <AdminNavList items={items} onNavigate={() => setOpen(false)} />
      </Drawer>
    </div>
  );
}
