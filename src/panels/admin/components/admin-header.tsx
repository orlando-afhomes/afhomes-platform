import { Header } from "antd/es/layout/layout";
import { AdminMobileNav } from "./admin-mobile-nav";
import styles from "./admin-header.module.css";

// Imported from path: Layout.Header statics are undefined on server
// components because the root import is a client reference.
export function AdminHeader() {
  return (
    <Header
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        height: 64,
        padding: "0 16px",
        background: "#fbfaf7",
        borderBottom: "1px solid #e5e0d4",
      }}
    >
      <AdminMobileNav />
      <h1 className={styles.title}>Administration</h1>
    </Header>
  );
}
