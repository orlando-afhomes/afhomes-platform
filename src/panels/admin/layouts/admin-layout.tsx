import Layout, { Content } from "antd/es/layout/layout";
import { AdminHeader } from "../components/admin-header";
import { AdminSidebar } from "../components/admin-sidebar";
import styles from "./admin-layout.module.css";

// Path imports: Layout.* statics are undefined when the root "antd" import
// is consumed from a server component (client reference has no statics).
export function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <Layout className={styles.layout} hasSider>
      <AdminSidebar />
      <Layout>
        <AdminHeader />
        <Content id="main-content" className={styles.content}>
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}
