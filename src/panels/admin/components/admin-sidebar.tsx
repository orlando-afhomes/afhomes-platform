"use client";

import { useState } from "react";
import { Layout } from "antd";
import { AdminNavList } from "./admin-nav-list";
import { useRoleAwareAdminNavigation } from "../use-role-aware-navigation";
import styles from "./admin-sidebar.module.css";

const { Sider } = Layout;

export function AdminSidebar() {
  const items = useRoleAwareAdminNavigation();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className={styles.siderWrap}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={(value) => setCollapsed(value)}
        width={240}
        theme="dark"
      >
        <div className={styles.brand}>AFHomes Admin</div>
        <AdminNavList items={items} />
      </Sider>
    </div>
  );
}
