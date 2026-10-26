import { AppShell } from "@/shared/components/layout/app-shell";
import { AdminHeader } from "../components/admin-header";
import { AdminSidebar } from "../components/admin-sidebar";

export function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell sidebar={<AdminSidebar />} header={<AdminHeader />}>
      {children}
    </AppShell>
  );
}
