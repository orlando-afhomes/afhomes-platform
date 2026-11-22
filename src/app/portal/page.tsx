import { Suspense } from "react";
import { PublicLoginSkeleton } from "@/panels/public/components/public-skeletons";
import { CustomerPortalPage } from "@/panels/customer-portal/pages/customer-portal-page";

// The sign-in reads the current year on the client; Suspense streams it per request under cacheComponents, as /login does.
export default function Page() {
  return (
    <Suspense fallback={<PublicLoginSkeleton />}>
      <CustomerPortalPage />
    </Suspense>
  );
}
