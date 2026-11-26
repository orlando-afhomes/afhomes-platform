import { AdminDashboardPage } from "@/panels/admin/pages/admin-dashboard-page";

// The admin shell authenticates client-side, so segments are not validated at instant-navigation time.
export const instant = false;

export default function AdminPage() {
  return <AdminDashboardPage />;
}
