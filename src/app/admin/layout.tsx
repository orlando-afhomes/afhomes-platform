import { AdminLayout } from "@/panels/admin/layouts/admin-layout";

export default function AdminSectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminLayout>{children}</AdminLayout>;
}