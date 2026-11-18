import { Suspense } from "react";
import { PublicLoginSkeleton } from "@/panels/public/components/public-skeletons";
import { StaffLoginPage } from "@/panels/public/pages/staff-login-page";

// Sign-in state is client-side; Suspense streams it per request under cacheComponents.
export default function Page() {
  return (
    <Suspense fallback={<PublicLoginSkeleton />}>
      <StaffLoginPage />
    </Suspense>
  );
}
