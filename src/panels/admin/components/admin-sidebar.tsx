"use client";

import { Button, Layout } from "antd";
import { LogoutOutlined } from "@ant-design/icons";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { AdminNavList } from "./admin-nav-list";
import { useRoleAwareAdminNavigation } from "../use-role-aware-navigation";
import { useLogout } from "../use-logout";

const { Sider } = Layout;

export function AdminSidebar({ collapsed, onCollapse }: { collapsed: boolean; onCollapse: (value: boolean) => void }) {
  const items = useRoleAwareAdminNavigation();
  const logout = useLogout();

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="admin-sidebar">
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={onCollapse}
        trigger={null}
        width={240}
        collapsedWidth={80}
        theme="dark"
        className="admin-sidebar__sider"
      >
        <div className="admin-sidebar__brand">
          <span className="admin-sidebar__brand-mark" aria-hidden="true">
            AF
          </span>
          <span className="admin-sidebar__brand-text">
            <span className="admin-sidebar__brand-name">AFHomes</span>
            <span className="admin-sidebar__brand-label">Management Platform</span>
          </span>
        </div>
        <nav aria-label="Administration" className="admin-sidebar__navigation">
          <AdminNavList items={items} />
        </nav>
        <div className="admin-sidebar__footer">
          <Button
            icon={<LogoutOutlined aria-hidden />}
            onClick={handleLogout}
            aria-label="Log out"
            className="admin-sidebar__logout"
            block
          >
            <span className="admin-sidebar__logout-label">Log out</span>
          </Button>
        </div>
      </Sider>
    </div>
  );
}
