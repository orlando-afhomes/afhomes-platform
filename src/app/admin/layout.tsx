import { Suspense } from "react";
import { AdminLayout } from "@/panels/admin/layouts/admin-layout";

// Admin is an authenticated, per-request shell (identity + query cache).
// Suspense lets the client navigation hooks (usePathname, useParams) stream per request
// under cacheComponents instead of failing the static prerender.
export default function AdminSectionLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense>
      <AdminLayout>{children}</AdminLayout>
    </Suspense>
  );
}
