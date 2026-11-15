import { Suspense } from "react";
import { ReportsAreaPage } from "@/panels/admin/pages/reports-area-page";

// shortcut: the client-only mock auth gate drops this page from instant-navigation validation; remove with the mock login.
export const instant = false;

export default function Page() {
  return (
    <Suspense>
      <ReportsAreaPage />
    </Suspense>
  );
}
