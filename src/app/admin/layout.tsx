import { Suspense } from "react";
import { AdminAuthGate } from "@/panels/admin/components/admin-auth-gate";
import { AdminLayout } from "@/panels/admin/layouts/admin-layout";
import { AdminShellSkeleton } from "@/shared/components/modern/skeletons";

// Admin is an authenticated, per-request shell (identity + query cache).
// Suspense lets the client navigation hooks (usePathname, useParams) stream per request
// under cacheComponents instead of failing the static prerender. The fallback is
// the shell skeleton, so a hard load never shows a blank screen.
export default function AdminSectionLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<AdminShellSkeleton />}>
      <AdminAuthGate>
        <AdminLayout>{children}</AdminLayout>
      </AdminAuthGate>
    </Suspense>
  );
}
