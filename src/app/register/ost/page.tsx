import { Suspense } from "react";
import { OstRegistrationPage } from "@/panels/public/pages/ost-registration-page";
import { PublicLayout } from "@/panels/public/layouts/public-layout";
import "@/panels/public/public.css";

// The registration form is client state; Suspense streams it per request under cacheComponents.
export default function Page() {
  return (
    <PublicLayout>
      <Suspense fallback={<p role="status">Loading registration form…</p>}>
        <OstRegistrationPage />
      </Suspense>
    </PublicLayout>
  );
}
