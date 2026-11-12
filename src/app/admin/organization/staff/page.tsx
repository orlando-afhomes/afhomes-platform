import { Suspense } from "react";
import { StaffPage } from "@/panels/admin/pages/staff-page";

// shortcut: the client-only mock auth gate drops this page from instant-navigation validation; remove with the mock login.
export const instant = false;

export default function Page() {
  // useSearchParams (the ?view= directory view) needs a Suspense boundary.
  return (
    <Suspense>
      <StaffPage />
    </Suspense>
  );
}
