import { AdminHeader } from "../components/admin-header";
import { AdminSidebar } from "../components/admin-sidebar";

export function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <AdminSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminHeader />
        <main className="flex-1 p-4">{children}</main>
      </div>
    </div>
  );
}