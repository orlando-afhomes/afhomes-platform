import { Suspense } from "react";
import { CommissionsAreaPage } from "@/panels/admin/pages/commissions-area-page";

// shortcut: the client-only mock auth gate drops this page from instant-navigation validation; remove with the mock login.
export const instant = false;

export default function Page() {
  return (
    <Suspense>
      <CommissionsAreaPage />
    </Suspense>
  );
}
