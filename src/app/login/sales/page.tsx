import { Suspense } from "react";
import { PublicLoginSkeleton } from "@/panels/public/components/public-skeletons";
import { SalesLoginPage } from "@/panels/public/pages/sales-login-page";

// Sign-in state is client-side; Suspense streams it per request under cacheComponents.
export default function Page() {
  return (
    <Suspense fallback={<PublicLoginSkeleton />}>
      <SalesLoginPage />
    </Suspense>
  );
}
