"use client";

import { useState } from "react";
import Layout, { Content } from "antd/es/layout/layout";
import { AdminHeader } from "../components/admin-header";
import { AdminSidebar } from "../components/admin-sidebar";

// Owns the sidebar collapsed state so the header toggle and the Sider stay in sync.
export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <Layout className="admin-layout" hasSider>
      <AdminSidebar collapsed={collapsed} onCollapse={setCollapsed} />
      <Layout className={`admin-layout__inner ${collapsed ? "admin-layout__inner--collapsed" : "admin-layout__inner--expanded"}`}>
        <AdminHeader collapsed={collapsed} onCollapse={setCollapsed} />
        <Content id="main-content" className="admin-layout__content">
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}
