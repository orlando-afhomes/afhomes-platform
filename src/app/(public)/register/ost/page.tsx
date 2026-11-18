import { Suspense } from "react";
import { OstRegistrationPage } from "@/panels/public/pages/ost-registration-page";

// The registration form is client state; Suspense streams it per request under cacheComponents.
export default function Page() {
  return (
    <Suspense fallback={<p role="status">Loading registration form…</p>}>
      <OstRegistrationPage />
    </Suspense>
  );
}
