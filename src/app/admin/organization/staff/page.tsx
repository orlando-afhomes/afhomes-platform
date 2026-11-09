import { Suspense } from "react";
import { StaffPage } from "@/panels/admin/pages/staff-page";

export default function Page() {
  // useSearchParams (the ?view= directory view) needs a Suspense boundary.
  return (
    <Suspense>
      <StaffPage />
    </Suspense>
  );
}
