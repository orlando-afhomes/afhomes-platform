import { Suspense } from "react";
import { AdminLayout } from "@/panels/admin/layouts/admin-layout";
import { AntdThemeProvider } from "@/theme/providers";

// Admin is an authenticated, per-request shell (identity + query cache).
// Suspense streams the antd runtime style cache (@ant-design/cssinjs reads
// Math.random, which cannot prerender under cacheComponents).
export default function AdminSectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense>
      <AntdThemeProvider>
        <AdminLayout>{children}</AdminLayout>
      </AntdThemeProvider>
    </Suspense>
  );
}